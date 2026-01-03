/* =====================================================
   SCRIPT PRINCIPAL — Cartes / Modale / Filtres / UI
   - Réorganisé + commenté
   - Ajout : Toggle Pro/Perso (style CodePen) + accessibilité
   ===================================================== */

/* =====================================================
   CONFIG GLOBALE
   ===================================================== */

const SUPPORTS_HOVER = window.matchMedia('(hover: hover)').matches;
const TILT_LIMIT = 15;

// Clone/modal actif
let $activeClone = null;

/* =====================================================
   HELPERS — 3D / Reset / Tilt
   ===================================================== */

function resetCard($card) {
    const isClone = $card.hasClass('card-clone');
    const base = isClone
        ? 'translate(-50%, -50%) perspective(1000px)'
        : 'perspective(1000px)';

    $card.css({
        boxShadow:
            "0px 0px 3px rgba(0,0,0,0.051), " +
            "0px 0px 7.2px rgba(0,0,0,0.073), " +
            "0px 0px 13.6px rgba(0,0,0,0.09), " +
            "0px 0px 24.3px rgba(0,0,0,0.107), " +
            "0px 0px 45.5px rgba(0,0,0,0.129), " +
            "0px 0px 109px rgba(0,0,0,0.18)",
        transform: `${base} rotateX(0deg) rotateY(0deg)`
    });

    $card.find('.glare').css('left', '100%');
}

function isTooFar(x, y, rect, maxRatio = 0.9) {
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = Math.min(rect.width, rect.height) * maxRatio;

    return dist > maxDist;
}

function apply3DEffect(e, $card) {
    const rect = $card[0].getBoundingClientRect();

    const clientX = e.clientX ?? e.originalEvent?.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.originalEvent?.touches?.[0]?.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (isTooFar(x, y, rect)) {
        resetCard($card);
        return;
    }

    const offsetX = x / rect.width;
    const offsetY = y / rect.height;

    const strength = $card.hasClass('expanded') ? 6 : TILT_LIMIT;
    const shadowStrength = $card.hasClass('expanded') ? 0.4 : 1;

    const rotateY = offsetX * (strength * 2) - strength;
    const rotateX = offsetY * (strength * 2) - strength;

    const shadowOffsetX = offsetX * 32 - 16;
    const shadowOffsetY = offsetY * 32 - 16;

    const isClone = $card.hasClass('card-clone');
    const base = isClone
        ? 'translate(-50%, -50%) perspective(1000px)'
        : 'perspective(1000px)';

    $card.css({
        boxShadow:
            (1 / 6) * -shadowOffsetX * shadowStrength + "px " +
            (1 / 6) * -shadowOffsetY * shadowStrength + "px 3px rgba(0,0,0,0.051), " +
            (2 / 6) * -shadowOffsetX * shadowStrength + "px " +
            (2 / 6) * -shadowOffsetY * shadowStrength + "px 7.2px rgba(0,0,0,0.073), " +
            (3 / 6) * -shadowOffsetX * shadowStrength + "px " +
            (3 / 6) * -shadowOffsetY * shadowStrength + "px 13.6px rgba(0,0,0,0.09), " +
            (4 / 6) * -shadowOffsetX * shadowStrength + "px " +
            (4 / 6) * -shadowOffsetY * shadowStrength + "px 24.3px rgba(0,0,0,0.107), " +
            (5 / 6) * -shadowOffsetX * shadowStrength + "px " +
            (5 / 6) * -shadowOffsetY * shadowStrength + "px 45.5px rgba(0,0,0,0.129), " +
            -shadowOffsetX * shadowStrength + "px " +
            -shadowOffsetY * shadowStrength + "px 109px rgba(0,0,0,0.18)",
        transform: `${base} rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`
    });

    const glarePos = rotateX + rotateY + 90;
    $card.find('.glare').css('left', glarePos + '%');
}

/* =====================================================
   MODULE — 3D GRILLE (desktop)
   ===================================================== */

function initGrid3D() {
    if (!SUPPORTS_HOVER) return;

    $(document).on('mousemove', '.card:not(.card-clone)', function (e) {
        apply3DEffect(e, $(this));
    });

    $(document).on('mouseleave', '.card:not(.card-clone):not(.expanded)', function () {
        resetCard($(this));
    });
}

/* =====================================================
   MODULE — GESTES CLONE (long-press tilt + swipe flip)
   ===================================================== */

function enableCloneGestures($clone) {
    $clone.off('.cloneLP');
    $(document).off('.cloneLP');

    let pointerId = null;
    let isDown = false;

    let pressTimer = null;
    let tiltActive = false;

    let startX = 0;
    let startY = 0;

    let flipped = $clone.hasClass('flipped');
    let flipLocked = false;

    let rafPending = false;
    let lastEvent = null;

    const LONG_PRESS_DELAY = 150;
    const FLIP_COOLDOWN = 220;
    const FLIP_RATIO = 2.8;

    function isCoarsePointer(e) {
        return e.pointerType === 'touch' || e.pointerType === 'pen';
    }

    function getPoint(e) {
        const oe = e.originalEvent || e;
        const t = oe.touches && oe.touches[0];
        return {
            x: e.clientX ?? t?.clientX ?? 0,
            y: e.clientY ?? t?.clientY ?? 0
        };
    }

    function flipThresholdPx() {
        const rect = $clone[0].getBoundingClientRect();
        return Math.max(60, rect.width * 0.35);
    }

    function scheduleTilt(e) {
        lastEvent = e;
        if (rafPending) return;

        rafPending = true;
        requestAnimationFrame(() => {
            rafPending = false;
            if (!isDown || !tiltActive || !lastEvent) return;
            apply3DEffect(lastEvent, $clone);
        });
    }

    function startLongPress() {
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
            if (!isDown) return;
            tiltActive = true;
            $clone.addClass('tilt-active');
        }, LONG_PRESS_DELAY);
    }

    function doFlip(p) {
        if (flipLocked) return;

        flipped = !flipped;
        $clone.toggleClass('flipped', flipped);

        startX = p.x;
        startY = p.y;

        tiltActive = false;
        resetCard($clone);
        startLongPress();

        flipLocked = true;
        setTimeout(() => (flipLocked = false), FLIP_COOLDOWN);
    }

    function endInteraction() {
        clearTimeout(pressTimer);

        isDown = false;
        tiltActive = false;
        rafPending = false;
        lastEvent = null;
        pointerId = null;

        resetCard($clone);
        $clone.removeClass('tilt-active');
    }

    $clone.on('pointerdown.cloneLP', function (e) {
        if (isCoarsePointer(e)) e.preventDefault();

        isDown = true;
        pointerId = e.pointerId;

        const p = getPoint(e);
        startX = p.x;
        startY = p.y;

        try { this.setPointerCapture(pointerId); } catch (_) { }

        startLongPress();
    });

    $(document).on('pointermove.cloneLP', function (e) {
        if (!isDown) return;
        if (pointerId !== null && e.pointerId !== pointerId) return;

        if (isCoarsePointer(e)) e.preventDefault();

        const p = getPoint(e);
        const dx = p.x - startX;
        const dy = p.y - startY;

        const threshold = flipThresholdPx();

        if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * FLIP_RATIO) {
            doFlip(p);
            return;
        }

        if (tiltActive) scheduleTilt(e);
    });

    $(document).on('pointerup.cloneLP pointercancel.cloneLP', function (e) {
        if (!isDown) return;
        if (pointerId !== null && e.pointerId !== pointerId) return;

        if (isCoarsePointer(e)) e.preventDefault();
        endInteraction();
    });
}

/* =====================================================
   MODULE — MODALE CLONE
   ===================================================== */

function initModalClone() {
    $(document).on('click', '.card:not(.card-clone)', function () {
        if ($activeClone) return;

        const $original = $(this);
        $original.addClass('disabled');

        const $clone = $original.clone(false, false)
            .removeClass('disabled')
            .addClass('card-clone expanded pop-in');

        const bg = $original.css('background-image');
        const text = $original.data('text') ?? '';
        const frontHTML = $clone.html();

        $clone.css('background-image', 'none');

        $clone.html(`
      <div class="card-inner">
        <div class="card-face card-front">${frontHTML}</div>
        <div class="card-face card-back">
          <div class="card-back-overlay">${text}</div>
        </div>
      </div>
    `);

        $clone.find('.card-front, .card-back').css('background-image', bg);

        $('body').append($clone);
        $('.overlay').addClass('active');
        $('body').addClass('modal-open');

        $activeClone = $clone;

        enableCloneGestures($clone);
        requestAnimationFrame(() => resetCard($clone));
    });

    $('.overlay').on('click', function () {
        if (!$activeClone) return;

        $('.card.disabled').removeClass('disabled');

        resetCard($activeClone);
        $activeClone.remove();

        $('.overlay').removeClass('active');
        $('body').removeClass('modal-open');

        $activeClone = null;
    });
}

/* =====================================================
   MODULE — HEADER AUTO-HIDE
   ===================================================== */

function initHeaderAutoHide() {
    const header = document.querySelector('.main-header');
    if (!header) return;

    let lastScrollY = window.scrollY;

    $(window).on('scroll', function () {
        const current = window.scrollY;
        header.classList.toggle('hidden', current > lastScrollY && current > 80);
        lastScrollY = current;
    });
}

/* =====================================================
   COULEURS DES FILTRES (depuis CSS)
   ===================================================== */

function applyFilterColorsFromCSS() {
    $('.filter-btn').each(function () {
        const $btn = $(this);
        const type = $btn.data('filter');

        if (type === 'all') {
            $btn.css('--filter-color', '#fff').css('color', '#000');
            return;
        }

        // Lecture couleur via classe CSS correspondante
        const temp = document.createElement('div');
        temp.className = type;
        temp.style.visibility = 'hidden';
        document.body.appendChild(temp);

        const color = getComputedStyle(temp).backgroundColor;
        document.body.removeChild(temp);

        $btn.css('--filter-color', color);
        $btn.css('color', $btn.hasClass('active') ? '#000' : color);
    });
}

/* =====================================================
   MODULE — FILTRES + TOGGLE PRO/PERSO (accessible)
   ===================================================== */

function initFiltersWithScopeSwitch() {
    const $filters = $('.filters');
    if (!$filters.length) return;

    const $scopeToggle = $('#scopeToggle');
    if (!$scopeToggle.length) {
        console.warn('scopeToggle introuvable : ajoute <input id="scopeToggle"> dans le HTML.');
    }

    // --- Sources ---
    const getCards = () => $('.wrapper .card').not('.card-clone');

    const getTypes = (cardEl) =>
        String($(cardEl).data('types') || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

    // --- Mapping types -> scope ---
    // IMPORTANT : "associatif" est bien rattaché à PERSO.
    const SCOPE_TYPES = {
        pro: new Set(['capgemini', 'conference', 'logotype']),
        perso: new Set(['jv', 'voyage', 'sport', 'musique', 'anime', 'cinema', 'associatif'])
    };

    /**
     * Retourne l'ensemble des scopes d'une carte (pro/perso).
     * - Si une carte contient des types des deux familles => elle appartient aux 2 scopes.
     * - Si aucun type ne matche, on la range par défaut en "perso" (modifiable si tu veux).
     */
    function computeScopesFromTypes(types) {
        const scopes = new Set();

        for (const t of types) {
            if (SCOPE_TYPES.pro.has(t)) scopes.add('pro');
            if (SCOPE_TYPES.perso.has(t)) scopes.add('perso');
        }

        if (scopes.size === 0) scopes.add('perso');
        return scopes;
    }

    function ensureCardScopes() {
        getCards().each(function () {
            const types = getTypes(this);
            const scopes = computeScopesFromTypes(types);
            // Stockage CSV pour simplicité: "pro" / "perso" / "pro,perso"
            this.dataset.scopes = [...scopes].join(',');
        });
    }

    function cardHasScope(cardEl, scope) {
        const scopes = String(cardEl.dataset.scopes || '');
        return scopes.split(',').map(s => s.trim()).includes(scope);
    }

    function buildTypesByScope() {
        const acc = { pro: new Set(), perso: new Set() };

        getCards().each(function () {
            const types = getTypes(this);

            if (cardHasScope(this, 'pro')) types.forEach(t => acc.pro.add(t));
            if (cardHasScope(this, 'perso')) types.forEach(t => acc.perso.add(t));
        });

        return { pro: [...acc.pro], perso: [...acc.perso] };
    }

    // --- Etat ---
    // Par défaut : PRO (toggle à gauche = unchecked)
    let activeScope = 'pro';
    let activeFilters = new Set(); // multi-select

    // --- URL restore (optionnel) ---
    const params = new URLSearchParams(location.search);
    if (params.has('scope')) {
        const s = params.get('scope');
        if (s === 'pro' || s === 'perso') activeScope = s;
    }
    if (params.has('filters')) {
        params
            .get('filters')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .forEach(f => activeFilters.add(f));
    }

    // --- Init cards scopes + types list ---
    ensureCardScopes();
    let allTypesByScope = buildTypesByScope();

    function getCardsInScope() {
        return getCards().filter(function () {
            return cardHasScope(this, activeScope);
        });
    }

    function pruneFiltersForScope() {
        const allowed = new Set(allTypesByScope[activeScope] || []);
        activeFilters = new Set([...activeFilters].filter(f => allowed.has(f)));
    }
    pruneFiltersForScope();

    /**
     * UI/ARIA du switch :
     * - unchecked => PRO (gauche)
     * - checked   => PERSO (droite)
     */
    function updateScopeToggleUI() {
        const isPerso = activeScope === 'perso';

        if ($scopeToggle.length) {
            $scopeToggle.prop('checked', isPerso);
            $scopeToggle.attr('aria-checked', String(isPerso));
        }
    }

    function buildFiltersUI() {
        $filters.empty();

        $filters.append(
            `<div class="filter-btn" data-filter="all">Tous <span class="filter-count"></span></div>`
        );

        (allTypesByScope[activeScope] || []).forEach(type => {
            $filters.append(
                `<div class="filter-btn" data-filter="${type}">${type} <span class="filter-count"></span></div>`
            );
        });
    }

    function updateUI() {
        const $all = $filters.find('[data-filter="all"]');
        const $cardsInScope = getCardsInScope();

        $all
            .toggleClass('active', activeFilters.size === 0)
            .find('.filter-count')
            .text($cardsInScope.length);

        $filters.find('.filter-btn').not($all).each(function () {
            const type = $(this).data('filter');
            let count = 0;

            $cardsInScope.each(function () {
                const test = new Set(activeFilters);
                test.add(type);

                const types = getTypes(this);
                if ([...test].every(f => types.includes(f))) count++;
            });

            $(this)
                .toggleClass('active', activeFilters.has(type))
                .toggleClass('disabled', count === 0)
                .attr('data-disabled', count === 0)
                .find('.filter-count')
                .text(count);
        });
    }

    function syncURL() {
        const p = new URLSearchParams();
        p.set('scope', activeScope);
        if (activeFilters.size) p.set('filters', [...activeFilters].join(','));
        history.replaceState(null, '', '?' + p.toString());
    }

    function applyFilters() {
        getCards().each(function () {
            // 1) Scope d'abord : la carte doit appartenir au scope actif (pro/perso)
            if (!cardHasScope(this, activeScope)) {
                $(this).hide().removeClass('is-hiding');
                return;
            }

            // 2) Puis filtres (multi-select en AND)
            const cardTypes = getTypes(this);
            const match = [...activeFilters].every(f => cardTypes.includes(f));

            if (match) {
                $(this).show().removeClass('is-hiding');
            } else {
                $(this).addClass('is-hiding');
                setTimeout(() => $(this).hide(), 200);
            }
        });

        updateUI();
        syncURL();
        applyFilterColorsFromCSS();
    }

    // ---- Events filtres ----
    $filters.on('click', '.filter-btn', function () {
        if ($(this).data('disabled')) return;

        const filter = $(this).data('filter');

        if (filter === 'all') {
            activeFilters.clear();
        } else {
            activeFilters.has(filter) ? activeFilters.delete(filter) : activeFilters.add(filter);
        }

        applyFilters();
    });

    // ---- Event toggle ----
    if ($scopeToggle.length) {
        $scopeToggle.on('change', function () {
            // Aligné avec le visuel : checked => PERSO, unchecked => PRO
            activeScope = this.checked ? 'perso' : 'pro';

            allTypesByScope = buildTypesByScope();
            pruneFiltersForScope();

            buildFiltersUI();
            updateScopeToggleUI();
            applyFilters();
        });
    }

    // ---- Drag-scroll filtres mobile (inchangé) ----
    (function enableFiltersDragScroll() {
        const el = $filters[0];
        if (!el) return;

        let isDown = false;
        let dragActive = false;
        let pointerId = null;

        let startX = 0;
        let startScrollLeft = 0;
        let pressTimer = null;

        const DRAG_LONG_PRESS = 160;

        function isCoarsePointer(e) {
            return e.pointerType === 'touch' || e.pointerType === 'pen';
        }

        function getClientX(e) {
            const oe = e.originalEvent || e;
            const t = oe.touches && oe.touches[0];
            return e.clientX ?? t?.clientX ?? 0;
        }

        function end() {
            clearTimeout(pressTimer);
            isDown = false;
            dragActive = false;
            pointerId = null;
            el.classList.remove('is-dragging');
        }

        $filters.on('pointerdown.filtersDrag', function (e) {
            if (!isCoarsePointer(e)) return;

            isDown = true;
            dragActive = false;
            pointerId = e.pointerId;

            startX = getClientX(e);
            startScrollLeft = el.scrollLeft;

            try { el.setPointerCapture(pointerId); } catch (_) { }

            clearTimeout(pressTimer);
            pressTimer = setTimeout(() => {
                if (!isDown) return;
                dragActive = true;
                el.classList.add('is-dragging');
            }, DRAG_LONG_PRESS);
        });

        $(document).on('pointermove.filtersDrag', function (e) {
            if (!isDown) return;
            if (!isCoarsePointer(e)) return;
            if (pointerId !== null && e.pointerId !== pointerId) return;

            if (dragActive) {
                e.preventDefault();
                const x = getClientX(e);
                const dx = x - startX;
                el.scrollLeft = startScrollLeft - dx;
            }
        });

        $(document).on('pointerup.filtersDrag pointercancel.filtersDrag', function (e) {
            if (!isDown) return;
            if (pointerId !== null && e.pointerId !== pointerId) return;
            end();
        });

        $filters.on('click.filtersDrag', '.filter-btn', function (e) {
            if (el.classList.contains('is-dragging')) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        });
    })();

    // ---- Initial render ----
    buildFiltersUI();
    updateScopeToggleUI();
    applyFilters();
}

/* =====================================================
   MODULE — LOADER
   ===================================================== */

function initLoader() {
    const $loader = $('.loader');
    if (!$loader.length) return;

    requestAnimationFrame(() => {
        $loader.addClass('hidden');
        setTimeout(() => $loader.remove(), 500);
    });
}

/* =====================================================
   MODULE — LAZY BACKGROUNDS
   ===================================================== */

function initLazyBackgrounds() {
    const cards = document.querySelectorAll('.card');
    if (!cards.length) return;

    function loadCardImage(card) {
        const src = card.dataset.bg;
        if (!src) return;

        const img = new Image();
        img.onload = () => {
            card.style.backgroundImage = `url("${src}")`;
            card.classList.remove('loading');
            card.classList.add('loaded');
        };
        img.src = src;
    }

    if (!('IntersectionObserver' in window)) {
        cards.forEach(loadCardImage);
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            loadCardImage(entry.target);
            obs.unobserve(entry.target);
        });
    }, { rootMargin: '200px', threshold: 0.1 });

    cards.forEach(card => {
        card.classList.add('loading');
        observer.observe(card);
    });
}

/* =====================================================
   MODULE — INTRO OVERLAY (session)
   ===================================================== */

function initIntroOverlay() {
    const $intro = $('.intro-overlay');
    if (!$intro.length) return;

    const alreadySeen = sessionStorage.getItem('introSeen');
    if (alreadySeen) {
        $intro.remove();
        return;
    }

    $('body').addClass('modal-open');

    $intro.find('.intro-btn').on('click', function () {
        $intro.addClass('hidden');
        $('body').removeClass('modal-open');

        sessionStorage.setItem('introSeen', 'true');
        setTimeout(() => $intro.remove(), 700);
    });
}

/* =====================================================
   MODULE — CUSTOM CURSOR (desktop)
   ===================================================== */

function initCustomCursor() {
    const dot = document.querySelector('.cursor-dot');
    const outline = document.querySelector('.cursor-outline');

    if (!dot || !outline) return;
    if (!SUPPORTS_HOVER) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let ox = x;
    let oy = y;

    document.addEventListener('mousemove', e => {
        x = e.clientX;
        y = e.clientY;

        dot.style.left = x + 'px';
        dot.style.top = y + 'px';
        dot.style.opacity = '1';

        outline.style.opacity = '1';
    });

    function loop() {
        ox += (x - ox) * 0.15;
        oy += (y - oy) * 0.15;

        outline.style.left = ox + 'px';
        outline.style.top = oy + 'px';

        requestAnimationFrame(loop);
    }

    loop();
}

/* =====================================================
   BOOTSTRAP
   ===================================================== */

$(document).ready(function () {
    initGrid3D();
    initModalClone();
    initHeaderAutoHide();

    // Filtres + Toggle Pro/Perso
    initFiltersWithScopeSwitch();

    // UI
    initLoader();
    initLazyBackgrounds();
    initIntroOverlay();

    // Curseur custom
    initCustomCursor();
});
