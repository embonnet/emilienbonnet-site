/* =====================================================
   CONFIGURATION GLOBALE
   ===================================================== */

// Détection du hover réel (desktop vs mobile)
const supportsHover = window.matchMedia('(hover: hover)').matches;

// Intensité max de l'effet 3D (cartes normales)
const TILT_LIMIT = 15;

// Durée du clic long (clone)
const LONG_PRESS_DELAY = 200;

// Clone actuellement ouvert (modal)
let $activeClone = null;


/* =====================================================
   OUTILS GÉNÉRAUX
   ===================================================== */

/**
 * Réinitialise la transformation 3D d'une carte
 */
function resetCard($card) {

    const isClone = $card.hasClass('card-clone');

    const baseTransform = isClone
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

        transform: `
            ${baseTransform}
            rotateX(0deg)
            rotateY(0deg)
        `
    });

    // Remet le glare hors écran
    $card.find('.glare').css('left', '100%');
}


/**
 * Vérifie si le curseur est trop loin du centre de la carte
 * (évite des rotations absurdes)
 */
function isTooFar(x, y, rect, maxRatio = 0.9) {

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const dx = x - centerX;
    const dy = y - centerY;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = Math.min(rect.width, rect.height) * maxRatio;

    return distance > maxDistance;
}


/**
 * Applique l'effet 3D à une carte selon la position du curseur
 */
function apply3DEffect(e, $card) {

    const rect = $card[0].getBoundingClientRect();

    // Support souris + tactile
    const clientX = e.clientX ?? e.originalEvent.touches?.[0].clientX;
    const clientY = e.clientY ?? e.originalEvent.touches?.[0].clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    //if ($card.hasClass('flipped')) return;

    // Si trop loin → reset
    if (isTooFar(x, y, rect)) {
        resetCard($card);
        return;
    }

    const offsetX = x / rect.width;
    const offsetY = y / rect.height;

    // Intensité différente grille / clone
    const strength = $card.hasClass('expanded') ? 6 : TILT_LIMIT;
    const shadowStrength = $card.hasClass('expanded') ? 0.4 : 1;

    const rotateY = offsetX * (strength * 2) - strength;
    const rotateX = offsetY * (strength * 2) - strength;

    const shadowOffsetX = offsetX * 32 - 16;
    const shadowOffsetY = offsetY * 32 - 16;

    const isClone = $card.hasClass('card-clone');

    const baseTransform = isClone
        ? 'translate(-50%, -50%) perspective(1000px)'
        : 'perspective(1000px)';

    // Ombres dynamiques + rotation
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

        transform: `
            ${baseTransform}
            rotateX(${-rotateX}deg)
            rotateY(${rotateY}deg)
        `
    });

    // Déplacement du glare
    const glarePos = rotateX + rotateY + 90;
    $card.find('.glare').css('left', glarePos + '%');
}


/* =====================================================
   EFFET 3D — CARTES DE LA GRILLE
   ===================================================== */

if (supportsHover) {
    $(document).on('mousemove', '.card:not(.card-clone)', function (e) {
        apply3DEffect(e, $(this));
    });

    $(document).on('mouseleave', '.card:not(.card-clone):not(.expanded)', function () {
        resetCard($(this));
    });
}

/* =====================================================
   CLIC LONG — EFFET 3D SUR LE CLONE
   ===================================================== */

function enableCloneLongPress($clone) {

    let timer = null;
    let tiltActive = false;
    let isPointerDown = false;

    let startX = 0;
    let startY = 0;
    let flipped = false;

    // RAF throttle
    let rafPending = false;
    let lastEvent = null;

    function getPoint(e) {
        return {
            x: e.clientX ?? e.originalEvent.touches?.[0]?.clientX,
            y: e.clientY ?? e.originalEvent.touches?.[0]?.clientY
        };
    }

    function getFlipThreshold() {
        const rect = $clone[0].getBoundingClientRect();
        return rect.width * 0.35;
    }

    function endInteraction() {
        clearTimeout(timer);
        tiltActive = false;
        isPointerDown = false;
        rafPending = false;
        lastEvent = null;

        // IMPORTANT : on revient à la base (inclut translate(-50%, -50%) pour le clone)
        resetCard($clone);
    }

    // Nettoyage d’éventuels handlers précédents sur CE clone
    $clone.off('.cloneLP');
    $(document).off('pointerup.cloneLP pointercancel.cloneLP pointerleave.cloneLP');

    $clone.on('pointerdown.cloneLP', function (e) {
        isPointerDown = true;

        const p = getPoint(e);
        startX = p.x;
        startY = p.y;

        timer = setTimeout(() => {
            if (isPointerDown) tiltActive = true;
        }, LONG_PRESS_DELAY);
    });

    $clone.on('pointermove.cloneLP', function (e) {
        if (!isPointerDown) return;

        const p = getPoint(e);
        const dx = p.x - startX;
        const dy = p.y - startY;

        const flipThreshold = getFlipThreshold();

        /* ===== FLIP (geste volontaire horizontal) ===== */
        if (
            Math.abs(dx) > flipThreshold &&
            Math.abs(dx) > Math.abs(dy) * 2.5
        ) {
            flipped = !flipped;
            $clone.toggleClass('flipped', flipped);

            clearTimeout(timer);
            tiltActive = false;
            resetCard($clone);
            return;
        }

        /* ===== TILT (uniquement après clic long) ===== */
        if (!tiltActive) return;

        lastEvent = e;
        if (rafPending) return;

        rafPending = true;
        requestAnimationFrame(() => {
            rafPending = false;
            if (lastEvent && isPointerDown && tiltActive) {
                apply3DEffect(lastEvent, $clone);
            }
        });
    });

    $(document).on('pointerup.cloneLP pointercancel.cloneLP pointerleave.cloneLP', endInteraction);
}


/* =====================================================
   OUVERTURE / FERMETURE MODALE (CLONE)
   ===================================================== */

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
        <div class="card-face card-front">
          ${frontHTML}
        </div>
        <div class="card-face card-back">
          <div class="card-back-overlay">
            ${text}
          </div>
        </div>
      </div>
    `);

    // APPLIQUER LE BACKGROUND APRÈS
    $clone.find('.card-front, .card-back').css('background-image', bg);

    $('body').append($clone);
    $('.overlay').addClass('active');
    $('body').addClass('modal-open');

    $activeClone = $clone;

    enableCloneLongPress($clone);

    requestAnimationFrame(() => {
        resetCard($clone);
    });
});

$('.overlay').on('click', function () {

    if (!$activeClone) return;

    // réactive la carte originale
    $('.card.disabled').removeClass('disabled');

    resetCard($activeClone);
    $activeClone.remove();

    $('.overlay').removeClass('active');
    $('body').removeClass('modal-open');

    $activeClone = null;
});


/* =====================================================
   HEADER AUTO-HIDE AU SCROLL
   ===================================================== */

$(document).ready(function () {

    const header = document.querySelector('.main-header');
    let lastScrollY = window.scrollY;

    $(window).on('scroll', function () {
        const current = window.scrollY;

        header.classList.toggle(
            'hidden',
            current > lastScrollY && current > 80
        );

        lastScrollY = current;
    });
});


/* =====================================================
   FILTRES AVANCÉS
   ===================================================== */

$(document).ready(function () {

    const $filters = $('.filters');
    if (!$filters.length) return;

    const getCards = () => $('.wrapper .card').not('.card-clone');
    const getTypes = card => $(card).data('types').split(',');

    const allTypes = [...new Set(
        getCards().toArray().flatMap(card => getTypes(card))
    )];

    let activeFilters = new Set();

    // Lecture URL
    const params = new URLSearchParams(location.search);
    if (params.has('filters')) {
        params.get('filters').split(',').forEach(f => activeFilters.add(f));
    }

    // Création UI
    $filters.append(`<div class="filter-btn" data-filter="all">Tous <span class="filter-count"></span></div>`);

    allTypes.forEach(type => {
        $filters.append(`<div class="filter-btn" data-filter="${type}">${type} <span class="filter-count"></span></div>`);
    });

    function applyFilters() {

        getCards().each(function () {

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

    function updateUI() {

        const $all = $filters.find('[data-filter="all"]');
        $all.toggleClass('active', activeFilters.size === 0)
            .find('.filter-count').text(getCards().length);

        $filters.find('.filter-btn').not($all).each(function () {

            const type = $(this).data('filter');
            let count = 0;

            getCards().each(function () {
                const test = new Set(activeFilters);
                test.add(type);

                if ([...test].every(f => getTypes(this).includes(f))) count++;
            });

            $(this)
                .toggleClass('active', activeFilters.has(type))
                .toggleClass('disabled', count === 0)
                .attr('data-disabled', count === 0)
                .find('.filter-count').text(count);
        });
    }

    function syncURL() {
        const p = new URLSearchParams();
        if (activeFilters.size) {
            p.set('filters', [...activeFilters].join(','));
        }
        history.replaceState(null, '', '?' + p.toString());
    }

    $filters.on('click', '.filter-btn', function () {

        if ($(this).data('disabled')) return;

        const filter = $(this).data('filter');

        if (filter === 'all') {
            activeFilters.clear();
        } else {
            activeFilters.has(filter)
                ? activeFilters.delete(filter)
                : activeFilters.add(filter);
        }

        applyFilters();
    });

    applyFilters();
});


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
   LOADER
   ===================================================== */

$(document).ready(function () {

    const $loader = $('.loader');
    if (!$loader.length) return;

    requestAnimationFrame(() => {
        $loader.addClass('hidden');
        setTimeout(() => $loader.remove(), 500);
    });
});


/* =====================================================
   LAZY LOAD DES BACKGROUNDS
   ===================================================== */

$(document).ready(function () {

    const cards = document.querySelectorAll('.card');

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
    }, {
        rootMargin: '200px',
        threshold: 0.1
    });

    cards.forEach(card => {
        card.classList.add('loading');
        observer.observe(card);
    });

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
});

/* =====================================================
   INTRO OVERLAY
   ===================================================== */

$(document).ready(function () {

    const $intro = $('.intro-overlay');
    if (!$intro.length) return;

    // Optionnel : afficher une seule fois par session
    const alreadySeen = sessionStorage.getItem('introSeen');

    if (alreadySeen) {
        $intro.remove();
        return;
    }

    // Bloque le scroll tant que l'intro est visible
    $('body').addClass('modal-open');

    $intro.find('.intro-btn').on('click', function () {

        $intro.addClass('hidden');
        $('body').removeClass('modal-open');

        sessionStorage.setItem('introSeen', 'true');

        setTimeout(() => {
            $intro.remove();
        }, 700);
    });
});

/* =========================
   CUSTOM CURSOR
   ========================= */

document.addEventListener('DOMContentLoaded', () => {

    const dot = document.querySelector('.cursor-dot');
    const outline = document.querySelector('.cursor-outline');

    if (!dot || !outline) return;
    if (!window.matchMedia('(hover: hover)').matches) return;

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
});