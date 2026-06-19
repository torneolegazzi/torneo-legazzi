// Funzioni condivise dalle pagine del sito Torneo Legazzi

function fmtCountdown(target) {
  const now = new Date();
  const diff = target - now;
  if (diff <= 0) return "In corso / scaduto";
  const giorni = Math.floor(diff / 86400000);
  const ore = Math.floor((diff % 86400000) / 3600000);
  const minuti = Math.floor((diff % 3600000) / 60000);
  const secondi = Math.floor((diff % 60000) / 1000);
  return `${giorni}g ${ore}h ${minuti}m ${secondi}s`;
}

async function caricaConfig() {
  const res = await fetch('dati/config.json?_=' + Date.now());
  return res.json();
}

// ---- Mostra solo "Regolamento" finche' il sito non e' completo ----
// Ritorna true se la pagina corrente puo' proseguire con la sua inizializzazione,
// false se e' stato avviato un redirect verso regolamento.html.
async function applicaVisibilitaSito() {
  try {
    const cfg = await caricaConfig();
    if (cfg.sito_completo === false) {
      const qui = location.pathname.split('/').pop() || 'index.html';
      if (qui !== 'regolamento.html') {
        location.replace('regolamento.html');
        return false;
      }
      document.querySelectorAll('nav a').forEach(a => {
        if (!a.getAttribute('href').includes('regolamento')) {
          a.style.display = 'none';
        }
      });
    }
  } catch (err) {
    // se la config non si carica, non blocchiamo la navigazione
  }
  return true;
}

// ---- Countdown a blocchi (digit-block) ----
function _pad(n) { return String(n).padStart(2, '0'); }

function _diffParts(target) {
  const diff = target - new Date();
  if (diff <= 0) return null;
  return {
    g: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000)  / 60000),
    s: Math.floor((diff % 60000)    / 1000),
  };
}

function _updateGrid(prefix, parts) {
  ['g','h','m','s'].forEach(key => {
    const el = document.getElementById(prefix + '-' + key);
    if (!el) return;
    const val = _pad(parts[key]);
    if (el.textContent !== val) {
      el.textContent = val;
      if (window.tickDigit) window.tickDigit(el);
    }
  });
}

// ---- Home: countdown prossima giornata + scadenza ritorno ----
async function avviaCountdownHome() {
  const elTitoloGiornata = document.getElementById('titolo-giornata');
  const elLinkForm       = document.getElementById('link-form');

  try {
    const cfg = await caricaConfig();

    if (cfg.link_form && cfg.link_form !== 'METTI_QUI_IL_LINK_AL_GOOGLE_FORM') {
      elLinkForm.href = cfg.link_form;
    } else {
      elLinkForm.style.display = 'none';
    }

    const now = new Date();
    const prossima = (cfg.giornate || [])
      .filter(g => g.data)
      .map(g => ({ numero: g.numero, data: new Date(g.data) }))
      .filter(g => g.data > now)
      .sort((a, b) => a.data - b.data)[0];

    function aggiorna() {
      // --- giornata ---
      if (prossima) {
        if (elTitoloGiornata) elTitoloGiornata.textContent = `Giornata ${prossima.numero}`;
        const pg = _diffParts(prossima.data);
        if (pg) {
          _updateGrid('cd', pg);
        } else {
          ['cd-g','cd-h','cd-m','cd-s'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '00';
          });
        }
      } else {
        if (elTitoloGiornata) elTitoloGiornata.textContent = '';
        ['cd-g','cd-h','cd-m','cd-s'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = '--';
        });
      }

      // --- ritorno ---
      if (cfg.scadenza_ritorno) {
        const pr = _diffParts(new Date(cfg.scadenza_ritorno));
        if (pr) {
          _updateGrid('cr', pr);
        } else {
          ['cr-g','cr-h','cr-m','cr-s'].forEach(id => {
            const el = document.getElementById(id); if (el) el.textContent = '00';
          });
        }
      }
    }
    aggiorna();
    setInterval(aggiorna, 1000);
  } catch (err) {
    console.error('Errore countdown:', err);
  }
}

// ---- Classifica: top N ----
async function caricaClassifica(top) {
  const info = document.getElementById('info');
  const wrap = document.getElementById('table-wrap');
  try {
    const res = await fetch('classifica.json?_=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    let righe = data.classifica || [];
    if (top) righe = righe.slice(0, top);

    info.textContent = 'Ultimo aggiornamento: ' + (data.ultimo_aggiornamento || '—');

    if (righe.length === 0) {
      wrap.innerHTML = '<div class="errore">Nessun dato disponibile.</div>';
      return;
    }

    let html = '<table><thead><tr><th>Pos</th><th>Nome</th><th class="totale">Punti</th></tr></thead><tbody>';
    for (const r of righe) {
      html += `<tr><td>${r.pos}</td><td class="nome">${r.nome}</td><td class="totale">${r.totale}</td></tr>`;
    }
    html += '</tbody></table>';
    wrap.innerHTML = html;
  } catch (err) {
    info.textContent = '';
    wrap.innerHTML = '<div class="errore">Errore nel caricamento della classifica: ' + err.message + '</div>';
  }
}

// ---- Pronostici: elenco partecipanti con link al loro PDF ----
async function caricaPronostici() {
  const wrap = document.getElementById('lista-partecipanti');
  try {
    const res = await fetch('classifica.json?_=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const righe = (data.classifica || []).slice().sort((a, b) => a.nome.localeCompare(b.nome));

    if (righe.length === 0) {
      wrap.innerHTML = '<div class="errore">Nessun partecipante trovato.</div>';
      return;
    }

    let html = '<ul class="partecipanti">';
    for (const r of righe) {
      html += `<li><span>${r.nome}</span><a href="pdf/pronostici/${r.id}.pdf" target="_blank">Vedi pronostici (PDF)</a></li>`;
    }
    html += '</ul>';
    wrap.innerHTML = html;
  } catch (err) {
    wrap.innerHTML = '<div class="errore">Errore nel caricamento dei partecipanti: ' + err.message + '</div>';
  }
}

// ---- Albo d'oro ----
async function caricaAlbo() {
  const wrap = document.getElementById('table-wrap-albo');
  try {
    const res = await fetch('dati/albo.json?_=' + Date.now());
    const albo = await res.json();

    if (!albo || albo.length === 0) {
      wrap.innerHTML = '<div class="placeholder">Nessuna edizione conclusa ancora. Torna qui a fine stagione!</div>';
      return;
    }

    let html = '<table><thead><tr><th>Stagione</th><th>1° posto</th><th>2° posto</th><th>3° posto</th></tr></thead><tbody>';
    for (const e of albo) {
      html += `<tr><td>${e.stagione}</td><td class="nome">${e.primo}</td><td class="nome">${e.secondo}</td><td class="nome">${e.terzo}</td></tr>`;
    }
    html += '</tbody></table>';
    wrap.innerHTML = html;
  } catch (err) {
    wrap.innerHTML = '<div class="errore">Errore nel caricamento dell\'albo d\'oro: ' + err.message + '</div>';
  }
}

// ---- Pagamento Revolut (home) ----
async function caricaPagamento() {
  try {
    const cfg = await caricaConfig();
    const pag = cfg.pagamento || {};
    const card = document.querySelector('.card-pagamento');
    const btn  = document.getElementById('link-revolut');

    if (pag.causale) document.getElementById('pagamento-causale').textContent = pag.causale;
    if (pag.importo) document.getElementById('pagamento-desc').textContent =
      `Paga la tua quota di ${pag.importo} tramite Revolut. Inserisci la causale nel campo note del pagamento.`;

    if (pag.link_revolut) {
      btn.href = pag.link_revolut;
    } else {
      btn.href = '#';
      btn.classList.add('btn-disabled');
      btn.textContent = 'Link Revolut prossimamente';
      btn.addEventListener('click', e => e.preventDefault());
    }
    card.style.display = '';
  } catch (_) {}
}

function copiaCausale() {
  const testo = document.getElementById('pagamento-causale').textContent;
  navigator.clipboard.writeText(testo).then(() => {
    const lbl = document.getElementById('copia-label');
    lbl.textContent = 'Copiata!';
    setTimeout(() => { lbl.textContent = 'Copia'; }, 2000);
  });
}

// ---- Top 3 home ----
async function caricaTop3() {
  const wrap = document.getElementById('top3');
  if (!wrap) return;
  try {
    const res = await fetch('classifica.json?_=' + Date.now());
    if (!res.ok) throw new Error();
    const data = await res.json();
    const top = (data.classifica || []).slice(0, 3);
    if (top.length === 0) {
      wrap.innerHTML = '<div class="placeholder">Nessun dato ancora.</div>';
      return;
    }
    const medaglie = ['🥇','🥈','🥉'];
    const classi   = ['pos-1','pos-2','pos-3'];
    wrap.innerHTML = top.map((r, i) => `
      <div class="top3-row ${classi[i]}">
        <span class="top3-medal">${medaglie[i]}</span>
        <span class="top3-nome">${r.nome}</span>
        <span class="top3-pt">${r.totale} <small>pt</small></span>
      </div>`).join('');
  } catch (_) {
    wrap.innerHTML = '<div class="placeholder">Classifica non ancora disponibile.</div>';
  }
}

// ---- Menzioni speciali + aggiornamento classifica (home) ----
async function caricaMenzioni() {
  try {
    const res = await fetch('dati/menzioni.json?_=' + Date.now());
    if (!res.ok) return;
    const data = await res.json();

    // --- aggiornamento classifica ---
    const elAgg = document.getElementById('aggiornamento-classifica');
    if (elAgg && data.aggiornamento_classifica) {
      elAgg.textContent = data.aggiornamento_classifica;
      elAgg.closest('.card-aggiornamento').style.display = '';
    }

    // --- menzioni speciali ---
    const elMenzioni = document.getElementById('lista-menzioni');
    if (elMenzioni && data.menzioni && data.menzioni.length > 0) {
      const icone = { speciale: '🏅', record: '📊', curiosita: '💡' };
      elMenzioni.innerHTML = data.menzioni.map(m => {
        const ico = icone[m.tipo] || '⭐';
        return `<div class="menzione-item" data-reveal="up">
          <span class="menzione-ico">${ico}</span>
          <p>${m.testo}</p>
        </div>`;
      }).join('');
      // registra reveal per gli elementi appena creati
      if (window._revealObs) {
        elMenzioni.querySelectorAll('[data-reveal]').forEach(el => window._revealObs.observe(el));
      }
      elMenzioni.closest('.card-menzioni').style.display = '';
    }
  } catch (_) {}
}

// ---- Info e contatti ----
async function caricaContatti() {
  const linkMail = document.getElementById('link-mail');
  const cardSegnalazioni = document.getElementById('card-segnalazioni');
  const linkSegnalazioni = document.getElementById('link-segnalazioni');
  try {
    const cfg = await caricaConfig();

    const email = cfg.email_contatti || '';
    if (email) {
      const oggetto = encodeURIComponent('Torneo Legazzi - Segnalazione');
      linkMail.href = `mailto:${email}?subject=${oggetto}`;
    } else {
      linkMail.style.display = 'none';
    }

    if (cfg.link_segnalazioni) {
      linkSegnalazioni.href = cfg.link_segnalazioni;
      cardSegnalazioni.style.display = '';
    }
  } catch (err) {
    linkMail.style.display = 'none';
  }
}
