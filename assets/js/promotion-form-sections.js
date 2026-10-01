(function () {
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function fieldFor(id) {
    var control = document.getElementById(id);
    return control ? control.closest('.field') : null;
  }

  function setSpan(id, span) {
    var field = fieldFor(id);
    if (!field) return;
    field.classList.remove('full', 'span-2', 'span-3');
    if (span) field.classList.add(span);
  }

  function section(id, title, icon, description, ids, jumpLabel) {
    var block = document.createElement('section');
    block.className = 'promo-standard-section';
    block.id = id;
    block.dataset.jumpLabel = jumpLabel || title;
    block.dataset.jumpIcon = icon || 'bi-dot';
    block.innerHTML =
      '<div class="promo-standard-section-head">' +
        '<i class="bi ' + icon + '" aria-hidden="true"></i>' +
        '<div><b>' + title + '</b>' +
        (description ? '<small>' + description + '</small>' : '') +
        '</div>' +
      '</div>' +
      '<div class="promo-standard-section-grid"></div>';

    var grid = block.querySelector('.promo-standard-section-grid');
    ids.forEach(function (fieldId) {
      var field = fieldFor(fieldId);
      if (field && !grid.contains(field)) grid.appendChild(field);
    });
    return block;
  }

  function buildJumpNav(sectionsRoot) {
    var sections = Array.prototype.slice.call(sectionsRoot.querySelectorAll('.promo-standard-section'));
    if (!sections.length) return;

    var nav = document.createElement('nav');
    nav.className = 'promo-edit-jump';
    nav.setAttribute('aria-label', 'Jump to form section');
    var track = document.createElement('div');
    track.className = 'promo-edit-jump-track';
    nav.appendChild(track);

    var workspace = document.querySelector('.promo-edit-workspace');
    var form = document.getElementById('promoForm');

    var buttons = [];
    var setActive = function (id) {
      buttons.forEach(function (b) {
        b.classList.toggle('is-active', b.dataset.target === id);
      });
    };

    /* —— A jump is a promise about where the section ENDS UP —————————————————————
       The offset that reaches it can only be computed once, before the page has finished
       loading, and everything above the target that arrives afterwards pushes it down by
       its own height. That is not hypothetical here: the provider / game block in Claim
       (above Wallet) renders when its request answers, and a 400px block measured after a
       jump left the page 410px short of Wallet. So a jump follows the animation and then
       keeps correcting until the section actually sits at the offset it was asked for.

       Corrections only run while the scroller is STILL: nudging a moving animation is what
       makes a jump look like two jumps. `pin` is the section a jump owns - the pill is not
       derived from the scroll position while it is set, which is the second half of this:
       through one Display -> Wallet jump the highlight used to alternate Period/Wallet six
       times and then settle on Rebate, because the rule was "the largest visible fraction"
       and two short cards shared the band that was being measured. */
    var OFFSET = 10;          /* px between the form's top edge and a jumped-to section */
    var HOLD_MS = 4000;       /* how long a jump keeps correcting while the page settles */
    var pin = null;           /* the section a jump is travelling to (null = at rest) */
    var jumpToken = 0;        /* supersedes an earlier jump's correction loop */
    var jumpBehavior = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';

    var maxTop = function () { return form ? Math.max(0, form.scrollHeight - form.clientHeight) : 0; };
    var clampTop = function (v) { return Math.max(0, Math.min(v, maxTop())); };
    /* How far the target sits BELOW where the click asked for it: positive = still to come. */
    var offsetError = function (target) {
      return (target.getBoundingClientRect().top - form.getBoundingClientRect().top) - OFFSET;
    };

    /* The section the viewport is resting on: the LAST one whose top has reached the form's
       top band. Deterministic, unlike the fraction-of-visibility rule this replaces. */
    var currentSectionId = function () {
      if (!form) return sections[0].id;
      if (maxTop() > 0 && form.scrollTop >= maxTop() - 2) return sections[sections.length - 1].id;
      var line = form.getBoundingClientRect().top + 24;
      var id = sections[0].id;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top <= line) id = sections[i].id;
        else break;
      }
      return id;
    };

    var syncActive = function () {
      if (pin) return;                       /* a jump owns the pill until it has landed */
      setActive(currentSectionId());
    };

    var holdTarget = function (target, token) {
      var t0 = performance.now();
      var last = -1, quiet = 0, rest = 0, satisfied = false;
      var frame = function () {
        if (token !== jumpToken || !target.isConnected) return;
        var top = form.scrollTop;
        quiet = (Math.abs(top - last) < 0.5) ? quiet + 1 : 0;
        last = top;
        /* 5 still frames AND past the animation's ramp-up: an animation that has started
           moves the offset every frame, so "still" here means it is over (or never began). */
        if (quiet >= 5 && performance.now() - t0 > 80) {
          var err = offsetError(target);
          if (Math.abs(err) > 1) {
            var next = clampTop(top + err);
            if (next === top) {
              rest++;                        /* end of the scroll - it cannot reach the top */
            } else {
              form.scrollTo({ top: next, behavior: Math.abs(err) > 120 ? jumpBehavior : 'auto' });
              quiet = 0;
              rest = 0;
            }
          } else {
            satisfied = true;
            rest++;
          }
        }
        if (rest > 30 || performance.now() - t0 > HOLD_MS) {   /* ~half a second at rest */
          pin = null;
          /* Released at the end of the scroll without landing: the click's pill stays lit
             rather than flipping to the bottom-most section the position rule would name;
             the next scroll re-derives it. */
          if (satisfied) syncActive();
          return;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };

    var scrollToSection = function (target) {
      if (!target) return;
      pin = target.id;
      setActive(target.id);
      if (!form) {
        target.scrollIntoView({ behavior: jumpBehavior, block: 'start' });
        pin = null;
        return;
      }
      var token = ++jumpToken;
      form.scrollTo({ top: clampTop(form.scrollTop + offsetError(target)), behavior: jumpBehavior });
      holdTarget(target, token);
    };

    /* The user takes the wheel back the moment they scroll, type or click into the form:
       a correction that lands after that is the page fighting its own user. */
    var releasePin = function () {
      if (!pin) return;
      jumpToken++;
      pin = null;
      syncActive();
    };
    if (form) {
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
        form.addEventListener(ev, releasePin, { passive: true });
      });
      var rafId = 0;
      form.addEventListener('scroll', function () {
        if (rafId) return;
        rafId = requestAnimationFrame(function () { rafId = 0; syncActive(); });
      }, { passive: true });
    }

    sections.forEach(function (sec, index) {
      if (!sec.id) sec.id = 'promo-sec-' + (index + 1);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'promo-edit-jump-btn';
      btn.dataset.target = sec.id;
      var titleEl = sec.querySelector('b');
      var label = sec.dataset.jumpLabel || (titleEl && titleEl.textContent) || ('Section ' + (index + 1));
      var icon = sec.dataset.jumpIcon || 'bi-dot';
      btn.innerHTML =
        '<i class="bi ' + icon + '" aria-hidden="true"></i>' +
        '<span>' + label + '</span>';
      btn.addEventListener('click', function () {
        var target = document.getElementById(btn.dataset.target);
        scrollToSection(target);
        try { btn.blur(); } catch (e) {}
      });
      track.appendChild(btn);
      buttons.push(btn);
    });

    if (workspace && form) {
      workspace.insertBefore(nav, form);
    } else if (sectionsRoot.parentNode) {
      sectionsRoot.parentNode.insertBefore(nav, sectionsRoot);
    }

    if (buttons[0]) setActive(buttons[0].dataset.target);
  }

  ready(function () {
    var originalGrid = document.querySelector('#promoForm .promo-form-grid');
    if (!originalGrid || originalGrid.dataset.sectionized === '1') return;
    originalGrid.dataset.sectionized = '1';

    originalGrid.querySelectorAll('.promo-policy-section').forEach(function (node) {
      node.remove();
    });

    var container = document.createElement('div');
    container.className = 'promo-standard-sections';

    container.appendChild(section(
      'promo-sec-display',
      'Display & Placement',
      'bi-image',
      'Where the card appears and how it lays out on desktop and mobile.',
      [
        'promoBonusCategoryTitleId', 'promoImage', 'promoItemName', 'promoLinkUrl',
        'promoDesktopColumns', 'promoMobileColumns', 'promoDesktopSpan', 'promoMobileSpan',
        'promoSingleLeft'
      ],
      'Display'
    ));

    container.appendChild(section(
      'promo-sec-basic',
      'Basic Promotion',
      'bi-info-circle',
      'Identity, type, claim trigger, VIP access and frontend status.',
      [
        'promoName', 'promoCode', 'promoBonusType', 'promoClaimCondition',
        'promoStatus', 'promoWallet', 'promoDisplayAmount', 'promoDisplayOrder'
      ],
      'Basic'
    ));

    container.appendChild(section(
      'promo-sec-amount',
      'Bonus Amount & Eligibility',
      'bi-gift',
      'Reward value, deposit range and payout limits.',
      [
        'promoPercentage', 'promoFixed', 'promoRandomMin', 'promoRandomMax',
        'promoMaxPayout', 'promoMinTopup', 'promoMaxTopup', 'promoMinTimes'
      ],
      'Amount'
    ));

    container.appendChild(section(
      'promo-sec-claim',
      'Claim, Rollover & Turnover',
      'bi-bar-chart-line',
      'Claim frequency, wagering requirements and allowed games.',
      [
        'promoClaimLimit', 'promoClaimReset', 'promoRollover', 'promoTurnover',
        'promoAllowedGames'
      ],
      'Claim'
    ));

    container.appendChild(section(
      'promo-sec-period',
      'Promotion Period & Completion',
      'bi-calendar-range',
      'Display and claim windows, plus completion rules after claiming.',
      [
        'promoStartAt', 'promoEndAt', 'promoClaimStartAt', 'promoClaimEndAt',
        'promoCompletionDeadlineMode', 'promoCompletionDays', 'promoCompletionFixedAt',
        'promoCompletionMode', 'promoRewardClaimMode'
      ],
      'Period'
    ));

    container.appendChild(section(
      'promo-sec-wallet',
      'Wallet Behaviour',
      'bi-wallet2',
      'Wallet consumption priority and win allocation.',
      ['promoWalletConsumptionPriority', 'promoWinAllocationRule'],
      'Wallet'
    ));

    container.appendChild(section(
      'promo-sec-rebate',
      'Rebate Policy',
      'bi-percent',
      'Control whether members under this promotion are eligible for rebate and when eligibility begins.',
      [
        'promoRebatePolicy', 'promoRebateStartCondition', 'promoEligibleBalanceType',
        'promoEligibleBalanceThreshold', 'promoNewDepositRequired', 'promoCanClaimRebate'
      ],
      'Rebate'
    ));

    container.appendChild(section(
      'promo-sec-withdraw',
      'Withdrawal Restriction',
      'bi-cash-stack',
      'Optional withdrawal limits and excess-balance handling.',
      ['promoWithdrawalRestriction', 'promoMaxWithdraw', 'promoExcessBalanceAction'],
      'Withdraw'
    ));

    container.appendChild(section(
      'promo-sec-content',
      'Terms & Frontend Content',
      'bi-card-text',
      'Member-facing copy for the promotion modal, plus language translations.',
      ['promoDescription', 'promoDetailEditor'],
      'Content'
    ));

    // Dock Language Translation inside Content so it reads as one composition.
    (function dockTranslationHost() {
      var content = container.querySelector('#promo-sec-content .promo-standard-section-grid');
      if (!content || content.querySelector('[data-translation-panel-host]')) return;
      var hostField = document.createElement('div');
      hostField.className = 'field full promo-translation-host-field';
      hostField.innerHTML =
        '<div class="promo-content-split-label" aria-hidden="true">' +
          '<i class="bi bi-translate"></i><span>Translations</span>' +
        '</div>' +
        '<div data-translation-panel-host class="promo-translation-host"></div>';
      content.appendChild(hostField);
    })();

    var remaining = Array.from(originalGrid.children).filter(function (node) {
      return node.classList && node.classList.contains('field');
    });
    // Claimable VIP + Daily Rebate eligibility historically lived with the Deposit/Winover note.
    var extra = section(
      'promo-sec-extra',
      'Additional Configuration',
      'bi-journal-check',
      'VIP access, daily-rebate eligibility and supporting calculation notes.',
      ['promoClaimableVipTiers', 'promoEligibleForDailyRebate'],
      'More'
    );
    var extraGrid = extra.querySelector('.promo-standard-section-grid');
    remaining.forEach(function (node) { extraGrid.appendChild(node); });
    container.insertBefore(extra, container.lastElementChild);

    originalGrid.replaceWith(container);

    var panel = document.createElement('div');
    panel.className = 'promo-edit-panel';
    container.parentNode.insertBefore(panel, container);
    panel.appendChild(container);
    buildJumpNav(container);

    // Operable spans after fields are back in the document (getElementById needs that).
    setSpan('promoBonusCategoryTitleId', 'span-2');
    setSpan('promoImage', 'span-2');
    setSpan('promoItemName', 'span-2');
    setSpan('promoLinkUrl', 'span-2');
    [
      'promoDesktopColumns', 'promoMobileColumns', 'promoDesktopSpan',
      'promoMobileSpan', 'promoSingleLeft'
    ].forEach(function (id) { setSpan(id, null); });
    setSpan('promoClaimableVipTiers', 'full');
    setSpan('promoAllowedGames', 'full');
    setSpan('promoDescription', 'full');
    setSpan('promoDetailEditor', 'full');

    // Display layout — twin panes: Section | This card (equal weight, scan side-by-side)
    (function buildDisplayLayoutCluster() {
      var sectionIds = ['promoDesktopColumns', 'promoMobileColumns'];
      var cardIds = ['promoDesktopSpan', 'promoMobileSpan', 'promoSingleLeft'];
      var sectionFields = sectionIds.map(fieldFor).filter(Boolean);
      var cardFields = cardIds.map(fieldFor).filter(Boolean);
      if (!sectionFields.length && !cardFields.length) return;

      var anchor = sectionFields[0] || cardFields[0];
      var parent = anchor && anchor.parentNode;
      if (!parent) return;

      var labels = {
        promoDesktopColumns: 'Desktop',
        promoMobileColumns: 'Mobile',
        promoDesktopSpan: 'Desktop',
        promoMobileSpan: 'Mobile',
        promoSingleLeft: 'Align'
      };
      Object.keys(labels).forEach(function (id) {
        var field = fieldFor(id);
        var lab = field && field.querySelector('label');
        if (lab) lab.textContent = labels[id];
      });

      var cluster = document.createElement('div');
      cluster.className = 'field full promo-display-layout';
      cluster.innerHTML =
        '<div class="promo-display-layout-head">' +
          '<b>Layout</b>' +
          '<small>Section columns apply to every card in this category. Span and align apply only here.</small>' +
        '</div>' +
        '<div class="promo-display-layout-panes">' +
          '<div class="promo-display-layout-pane" data-pane="section">' +
            '<div class="promo-display-layout-pane-head">' +
              '<span class="promo-display-layout-pane-title">Section</span>' +
              '<span class="promo-display-layout-pane-hint">Shared grid</span>' +
            '</div>' +
            '<div class="promo-display-layout-controls is-section"></div>' +
          '</div>' +
          '<div class="promo-display-layout-pane" data-pane="card">' +
            '<div class="promo-display-layout-pane-head">' +
              '<span class="promo-display-layout-pane-title">This card</span>' +
              '<span class="promo-display-layout-pane-hint">Span &amp; align</span>' +
            '</div>' +
            '<div class="promo-display-layout-controls is-card"></div>' +
          '</div>' +
        '</div>';

      var sectionControls = cluster.querySelector('.promo-display-layout-controls.is-section');
      var cardControls = cluster.querySelector('.promo-display-layout-controls.is-card');
      parent.insertBefore(cluster, anchor);
      sectionFields.forEach(function (field) {
        field.classList.remove('full', 'span-2', 'span-3');
        sectionControls.appendChild(field);
      });
      cardFields.forEach(function (field) {
        field.classList.remove('full', 'span-2', 'span-3');
        cardControls.appendChild(field);
      });

      Array.prototype.slice.call(parent.querySelectorAll('.field.full')).forEach(function (node) {
        if (node === cluster) return;
        var help = node.querySelector('.promo-help');
        if (!help) return;
        var text = (help.textContent || '').toLowerCase();
        if (text.indexOf('section grid') !== -1 || text.indexOf('card span') !== -1) {
          node.remove();
        }
      });
    })();
  });
})();
