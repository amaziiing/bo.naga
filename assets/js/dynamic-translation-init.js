(function(){
  function init(){
    if(!window.DynamicTranslation) return;
    // New declarative mode: no page-name registration is needed.
    window.DynamicTranslation.autoAttach(document);

    // Legacy pages below remain supported without changing their existing HTML.
    const page = (location.pathname.split('/').pop() || '').toLowerCase();
    const map = {
      'slider.html': {formId:'sliderForm', idSelector:'#sliderId', refType:'slider'},
      'game-category.html': {formId:'categoryForm', idSelector:'#categoryId', refType:'game_category'},
      'game-sub-category.html': {formId:'subCategoryForm', idSelector:'#subCategoryId', refType:'game_sub_category'},
      'game.html': {formId:'gameForm', idSelector:'#gameId', refType:'game'},
      // bonus-category-title.html folded into promotion.html; that page attaches its
      // category form declaratively through data-translation-ref-type (see promotion.html),
      // so no page-name registration is needed for it here.
      'bonus-category-item.html': {formId:'bonusItemForm', idSelector:'#bonusItemId', refType:'bonus_category_item'},
      'site-customize.html': {assetPanel:true, refType:'main_layout', refId:1, containerSelector:'#main-layout'}
    };
    const cfg = map[page];
    if(cfg && cfg.assetPanel) window.DynamicTranslation.attachAssetPanel(cfg);
    else if(cfg) window.DynamicTranslation.attach(cfg);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
