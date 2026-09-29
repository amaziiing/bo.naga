/* Bank Quick Selector + Balance Summary.
   ------------------------------------------------------------------
   One implementation of the bank selector, shared by Deposit Approval
   (member-deposit.js) and Withdraw Approval (member-withdraw.js). Before this file each
   page carried its own copy of the bank card markup; the selector is the part that must
   never drift between them, so it lives here.

   Presentational only: it returns HTML strings and owns no state. The page modules keep
   the selected bank, because they also need it to filter their table and to reset paging.
   Money formatting is passed in so the numbers here are formatted exactly like the
   numbers in the table next to them.

   Money model (agreed with the owner):
     Balance = the bank's current usage figure (`bankUsage` on the payment-method list) —
               the same value the approval dialogs move: an approved deposit adds to it,
               an approved withdrawal deducts from it.
     Start   = Balance − this period's flow, so `Start + Deposit = Balance` holds exactly.
     Where `bankUsage` is absent the strip prints an em dash. It never guesses a number.
   The balance is a real API value; the start is arithmetic on it. See
   BANK_BALANCE_API.md for the explicit start/balance fields we asked the backend for.
   ------------------------------------------------------------------ */
(function(){
  'use strict';

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function num(v){const n=Number(v||0);return Number.isFinite(n)?n:0;}

  /* The line under a bank's name in a tooltip: what tells two accounts of the same bank apart.
     Anything identical to the name is dropped, because the name is printed next to it. */
  function detailLabel(m,name){
    const bare=String(name||'').trim();
    return [m&&m.displayName,m&&m.accountNumber]
      .map(function(v){ return String(v==null?'':v).trim(); })
      .filter(function(v){ return v&&v!==bare; })
      .join(' · ');
  }

  /* One card per bank, every bank complete without a click: name (with the pending count), the
     Start and Deposit rows, then Balance on its own row below a hairline. `cols` is the same
     shape the modules already build:
       [{id, name, count, selected, aria, start:{}, flow:{}, balance:{}}]
     The module owns the arithmetic (deposit and withdraw derive the opening figure differently);
     this function only lays the slots out. `data-bo-ui-skip` keeps the global button standard
     from painting the name as a secondary BO button. */
  function bankCardsHtml(cols, money){
    if(!cols.length) return '<span class="bo-bank-chip is-empty">No payment methods</span>';
    const value=function(v, extra){
      const known=v&&v.known!==false;
      const title=v&&v.title?v.title:(v&&v.text?v.text:'');
      return '<b class="bo-bank-card-value'+(extra||'')+(known?'':' is-unknown')+'"'+(title?' title="'+esc(title)+'"':'')+'>'+
        (known?esc(money(v.value)):esc((v&&v.text)||'n/a'))+
      '</b>';
    };
    return '<div class="bo-bank-cards">'+cols.map(function(c){
      const sel=c.selected?' is-selected':'';
      const count=num(c.count);
      const title=[c.name,
        count>0?(count+' pending '+(count===1?'request':'requests')):'',
        c.selected?'Click again to clear the selection':''
      ].filter(Boolean).join(' · ');
      return '<article class="bo-bank-card'+sel+'">'+
        '<header class="bo-bank-card-head">'+
          '<button type="button" class="bo-bank-chip'+sel+'" data-bank-id="'+esc(c.id)+'" data-bo-ui-skip'+
            ' aria-pressed="'+(c.selected?'true':'false')+'" aria-label="'+esc(c.aria||c.name)+'" title="'+esc(title)+'">'+
            '<span class="bo-bank-chip-name">'+esc(c.name)+'</span>'+
            (count>0?'<span class="bo-bank-chip-badge" aria-hidden="true">'+count+'</span>':'')+
          '</button>'+
        '</header>'+
        '<div class="bo-bank-card-row"><span>Start</span>'+value(c.start)+'</div>'+
        '<div class="bo-bank-card-row"><span>Deposit</span>'+value(c.flow)+'</div>'+
        '<div class="bo-bank-card-foot"><span>Balance</span>'+value(c.balance,' is-total')+'</div>'+
      '</article>';
    }).join('')+'</div>';
  }
  window.BO_BANK_SELECTOR={
    detailLabel:detailLabel,
    bankCardsHtml:bankCardsHtml
  };
})();
