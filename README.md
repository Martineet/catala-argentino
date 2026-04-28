# 📓 Català per a Argentins — Workbook

Aplicació web per aprendre català, pensada per a parlants d'argentí.
Les cartes es sincronitzen entre tots els usuaris via **Supabase** en temps real.

---

## 🗄️ Pas 1 — Configurar Supabase

1. Ves a [supabase.com](https://supabase.com) i obre el teu projecte
2. Ves a **SQL Editor → New query**
3. Enganxa i executa tot el contingut de `setup_supabase.sql`
4. Ja tens la taula, les polítiques RLS i les cartes inicials ✅

---

## 🚀 Pas 2 — Pujar a GitHub Pages

### Crea el repositori
- Ves a [github.com](https://github.com) i crea un repositori nou
- Posa-li el nom que vulguis (ex: `catala-workbook`)
- Deixa-ho **públic**

### Puja els arxius
Puja aquests 3 arxius al repositori (arrossega i deixa anar):
- `index.html`
- `style.css`
- `app.js`

(El `setup_supabase.sql` i el `README.md` són opcionals, no afecten la web)

### Activa GitHub Pages
- Ves a **Settings → Pages**
- Source: **Deploy from a branch**
- Branch: `main` / `(root)`
- Clica **Save**

La URL serà: `https://<usuari>.github.io/<repositori>/`

---

## 📱 Funcionalitats

- **Taula compartida**: Totes les persones veuen les mateixes cartes (Supabase)
- **Temps real**: Si una persona afegeix una carta, les altres la veuen immediatament
- **Ordena i cerca**: Per català, argentí o dificultat
- **Mode examen**: Practica i porta el compte de punts
- **RLS segura**: Els usuaris anònims poden afegir però no esborrar

## 💡 Dreceres de teclat (mode examen)

| Tecla | Acció |
|-------|-------|
| `Espai` | Revela la resposta |
| `→` o `Enter` | Encertat (+1) |
| `←` | Fallat (-1) |
| `Esc` | Tanca el modal |

---

Fet amb ❤️ de BCN a BsAs 🧉
