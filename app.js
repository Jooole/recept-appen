import { receptDatabas } from './recept.js';

// --- HTML ELEMENT ---
const selectionSubheader = document.getElementById('selection-subheader');
const availableIngredientsList = document.getElementById('available-ingredients-list');
const selectedSection = document.getElementById('selected-section');
const selectedIngredientsList = document.getElementById('selected-ingredients-list');
const clearAllButton = document.getElementById('clear-all-button');
const recipeSubheader = document.getElementById('recipe-subheader');
const recipesResultsContainer = document.getElementById('recipes-results-container');
const ingredientSearch = document.getElementById('ingredient-search');

// Modal-element
const openModalBtn = document.querySelector('.primary-button'); // Knappen i headern
const recipeModal = document.getElementById('recipe-modal');
const closeModalBtn = document.getElementById('close-modal');
const recipeForm = document.getElementById('recipe-form');
const formIngredientsList = document.getElementById('form-ingredients-list');
const formStepsList = document.getElementById('form-steps-list');
const addFormIngredientBtn = document.getElementById('add-form-ingredient');
const addFormStepBtn = document.getElementById('add-form-step');

// --- TILLSTÅND (STATE) ---
let valdaIngredienser = [];
let sokord = '';

// --- FUNKTIONER ---

// 1. Samla alla unika ingredienser från recepten
function hamtaUnikaIngredienser() {
    const allaIngredienser = [];
    receptDatabas.forEach(recept => {
        recept.ingredienser.forEach(ingrediens => {
            if (!allaIngredienser.includes(ingrediens)) {
                allaIngredienser.push(ingrediens);
            }
        });
    });
    return allaIngredienser.sort();
}

// 2. Skapa klickbara rader för ingredienserna (Uppdaterad)
function ritaUtAvailableIngredienser() {
    const unikaIngredienser = hamtaUnikaIngredienser();
    
    // 1. Filtrera bort ingredienser som redan är valda
    let tillgangligaIngredienser = unikaIngredienser.filter(ingrediens => 
        !valdaIngredienser.includes(ingrediens)
    );

    // 2. NYTT: Filtrera baserat på vad man skrivit i sökfältet
    // .toLowerCase() gör att sökningen inte bryr sig om stora/små bokstäver
    tillgangligaIngredienser = tillgangligaIngredienser.filter(ingrediens => 
        ingrediens.toLowerCase().includes(sokord.toLowerCase())
    );

    availableIngredientsList.innerHTML = ''; // Töm listan

    // Loopa igenom tillgangligaIngredienser istället för unikaIngredienser
    tillgangligaIngredienser.forEach(ingrediens => {
        const label = document.createElement('label');
        label.textContent = ingrediens;
        label.id = `row-${ingrediens}`;

        // Skapa en gömd checkbox i bakgrunden (behövs för att hålla reda på id-kopplingar)
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = ingrediens;
        checkbox.id = `check-${ingrediens}`;
        
        // Lägg till den gömda checkboxen inuti labeln
        label.appendChild(checkbox);

        // Lyssna på klick på hela label-raden!
        label.addEventListener('click', (e) => {
            // Förhindra att klicket körs dubbelt (eftersom label + gömd input kan krocka vid klick)
            e.preventDefault(); 
            
            // Kör vår modifierade hanterare
            hanteraKlickRad(ingrediens);
        });

        availableIngredientsList.appendChild(label);
    });
}

// 3. Hantera när användaren klickar på en ingrediensrad (Uppdaterad)
function hanteraKlickRad(ingrediensName) {
    // Nollställ sökningen DIREKT när man klickar på en rad
    sokord = '';
    ingredientSearch.value = '';

    // Kolla om ingrediensen redan finns i listan över valda
    const index = valdaIngredienser.indexOf(ingrediensName);

    if (index === -1) {
        // Om den INTE finns: Lägg till den
        valdaIngredienser.push(ingrediensName);
    } else {
        // Om den REDAN finns: Ta bort den (om man klickar på samma rad igen)
        valdaIngredienser.splice(index, 1);
    }
    
    // Uppdatera gränssnittet och räkna om recepten automatiskt
    uppdateraValdaIngredienserUI();
    uppdateraReceptLista();

    // Rita om ingredienslistan så att den klickade ingrediensen försvinner därifrån
    ritaUtAvailableIngredienser();
}

// 4. Uppdatera gränssnittet för valda ingredienser (Tags)
function uppdateraValdaIngredienserUI() {
    selectionSubheader.textContent = `${valdaIngredienser.length} ingredienser valda`;

    if (valdaIngredienser.length > 0) {
        selectedSection.classList.remove('hidden');
    } else {
        selectedSection.classList.add('hidden');
    }

    selectedIngredientsList.innerHTML = '';
    valdaIngredienser.forEach(ingrediensName => {
        const tag = document.createElement('div');
        tag.className = 'ingredient-tag';
        tag.textContent = ingrediensName;

        const removeButton = document.createElement('button');
        removeButton.textContent = '×';
        removeButton.addEventListener('click', () => taBortTag(ingrediensName));
        
        tag.appendChild(removeButton);
        selectedIngredientsList.appendChild(tag);
    });
}

// 5. Ta bort en ingrediens via tag-krysset
function taBortTag(ingrediensName) {
    valdaIngredienser = valdaIngredienser.filter(ingrediens => ingrediens !== ingrediensName);
    
    const checkbox = document.getElementById(`check-${ingrediensName}`);
    if (checkbox) {
        checkbox.checked = false;
    }
    
    uppdateraValdaIngredienserUI();
    uppdateraReceptLista(); // Uppdatera listan efter borttagning
    ritaUtAvailableIngredienser();
}

// 6. Rensa alla val (Clear all)
clearAllButton.addEventListener('click', () => {
    valdaIngredienser = [];
    const allCheckboxes = availableIngredientsList.querySelectorAll('input[type="checkbox"]');
    allCheckboxes.forEach(checkbox => checkbox.checked = false);
    
    uppdateraValdaIngredienserUI();
    uppdateraReceptLista(); // Uppdatera listan så att allt visar 0% igen
    ritaUtAvailableIngredienser();
});

// ========================================
// RECEPT-LOGIK (Här händer det magiska!)
// ========================================

function uppdateraReceptLista() {
    // a) Loopa igenom alla recept och räkna ut matchningsprocent + saknade ingredienser
    const bearbetadeRecept = receptDatabas.map(recept => {
        
        // Hitta vilka ingredienser i receptet som användaren har i kylen
        const matchande = recept.ingredienser.filter(ingrediens => 
            valdaIngredienser.includes(ingrediens)
        );

        // Hitta vilka ingredienser som saknas
        const saknade = recept.ingredienser.filter(ingrediens => 
            !valdaIngredienser.includes(ingrediens)
        );

        // Räkna ut procent (om inga ingredienser är valda blir det 0%)
        let procent = 0;
        if (recept.ingredienser.length > 0) {
            procent = Math.round((matchande.length / recept.ingredienser.length) * 100);
        }

        // Returnera ett nytt tillfälligt objekt med beräkningarna inkluderade
        return {
            ...recept,
            matchningsProcent: procent,
            saknadeIngredienser: saknade
        };
    });

    // b) Sortera listan så att högst procent hamnar först (fallande ordning)
    bearbetadeRecept.sort((a, b) => b.matchningsProcent - a.matchningsProcent);

    // c) Uppdatera subheadern för receptlistan
    recipeSubheader.textContent = `Visar ${bearbetadeRecept.length} recept baserat på dina ingredienser`;

    // d) Rendera ut recepten i HTML
    recipesResultsContainer.innerHTML = ''; // Töm gamla listan

    bearbetadeRecept.forEach(recept => {
        const receptKort = document.createElement('div');
        receptKort.className = 'recept-kort';
        receptKort.style.marginBottom = '1.5rem';
        receptKort.style.padding = '1.5rem';
        receptKort.style.border = '1px solid #E2E8F0';
        receptKort.style.borderRadius = '12px';
        receptKort.style.backgroundColor = 'white';

        // 1. Bestäm färgklass baserat på procent
        let färgKlass = 'gray-match';
        if (recept.matchningsProcent >= 75) {
            färgKlass = 'green-match';
        } else if (recept.matchningsProcent >= 50) {
            färgKlass = 'yellow-match';
        }

        // 2. Flex-behållare för rubrik och procentruta (Tidsinfon borttagen härifrån!)
        const headerFlex = document.createElement('div');
        headerFlex.className = 'recept-header-flex';

        const titelInfoDiv = document.createElement('div');
        const rubrik = document.createElement('h1'); 
        rubrik.textContent = recept.namn;
        titelInfoDiv.appendChild(rubrik);

        const procentBadge = document.createElement('div');
        procentBadge.className = `match-badge ${färgKlass}`;
        procentBadge.textContent = `${recept.matchningsProcent}%`;

        headerFlex.appendChild(titelInfoDiv);
        headerFlex.appendChild(procentBadge);
        receptKort.appendChild(headerFlex);

        // 3. Visa saknade ingredienser om det behövs
        if (recept.matchningsProcent < 100 && valdaIngredienser.length > 0) {
            // Skapa huvudbehållaren för hela raden
            const saknadeContainer = document.createElement('div');
            saknadeContainer.className = 'saknade-container';

            // Skapa texten "Saknas:"
            const saknadeTitel = document.createElement('span');
            saknadeTitel.className = 'saknade-titel';
            saknadeTitel.textContent = 'Saknas:';
            saknadeContainer.appendChild(saknadeTitel);

            // Loopa igenom varje saknad ingrediens och skapa en egen badge
            recept.saknadeIngredienser.forEach(ingrediens => {
                const badge = document.createElement('span');
                badge.className = 'saknad-badge';
                badge.textContent = ingrediens;
                saknadeContainer.appendChild(badge);
            });

            // Lägg till hela härligheten i receptkortet
            receptKort.appendChild(saknadeContainer);
        }

        // 4. Skapa den stegvisa instruktionslistan
        const ol = document.createElement('ol');
        ol.style.paddingLeft = '1.25rem';
        ol.style.marginTop = '0.5rem';
        recept.instruktioner.forEach(steg => {
            const li = document.createElement('li');
            li.textContent = steg;
            ol.appendChild(li);
        });
        receptKort.appendChild(ol);

        // 5. NYTT: Skapa en Footer för kortet med klockikon och tid
        const footer = document.createElement('footer');
        footer.className = 'recept-footer';

        const tidContainer = document.createElement('div');
        tidContainer.className = 'tid-container';

        // Här ritar vi upp en stilren klockikon via SVG
        tidContainer.innerHTML = `
            <svg class="tid-ikon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin='round' stroke-width='2' d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
            </svg>
            <span>${recept.tid}</span>
        `;

        footer.appendChild(tidContainer);
        receptKort.appendChild(footer); // Lägg till footern absolut längst ner på kortet

        recipesResultsContainer.appendChild(receptKort);
    });
}

// 7. Lyssna på sökfältet (Körs varje gång användaren trycker på en tangent)
ingredientSearch.addEventListener('input', (e) => {
    sokord = e.target.value; // Uppdatera vårt sökord-tillstånd med texten från fältet
    ritaUtAvailableIngredienser(); // Rita om listan direkt!
});

// ========================================
// MODAL & FORMULÄR-LOGIK
// ========================================

// Öppna modalen
openModalBtn.addEventListener('click', () => {
    recipeModal.classList.remove('hidden');
});

// Stäng modalen via krysset
closeModalBtn.addEventListener('click', () => {
    recipeModal.classList.add('hidden');
});

// Stäng modalen om man klickar utanför fönstret
window.addEventListener('click', (e) => {
    if (e.target === recipeModal) {
        recipeModal.classList.add('hidden');
    }
});

// Lägg till nytt ingrediensfält i formuläret
addFormIngredientBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-ingredient-input';
    input.placeholder = 'T.ex. Mjölk';
    formIngredientsList.appendChild(input);
});

// Lägg till nytt instruktionssteg i formuläret
addFormStepBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-step-input';
    const stegNummer = formStepsList.getElementsByTagName('input').length + 1;
    input.placeholder = `Steg ${stegNummer}: T.ex. Rör om`;
    formStepsList.appendChild(input);
});

// Hantera när formuläret skickas (Spara recept)
recipeForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Förhindra att sidan laddas om

    // 1. Samla in bas-data
    const namn = document.getElementById('form-recipe-name').value;
    const tid = document.getElementById('form-recipe-time').value;

    // 2. Samla in alla ingredienser från formuläret och städa bort tomma fält
    const ingrediensInputs = document.querySelectorAll('.form-ingredient-input');
    const ingredienser = Array.from(ingrediensInputs)
        .map(input => input.value.trim())
        .filter(value => value !== '');

    // 3. Samla in alla steg från formuläret och städa bort tomma fält
    const stegInputs = document.querySelectorAll('.form-step-input');
    const instruktioner = Array.from(stegInputs)
        .map(input => input.value.trim())
        .filter(value => value !== '');

    // 4. Skapa det nya recept-objektet
    const nyttRecept = {
        id: String(receptDatabas.length + 1), // Skapa ett enkelt temporärt ID
        namn: namn,
        tid: tid,
        ingredienser: ingredienser,
        instruktioner: instruktioner
    };

    // 5. Tryck in det nya receptet i vår lokala receptDatabas!
    receptDatabas.push(nyttRecept);

    // 6. Nollställ formuläret och stäng fönstret
    recipeForm.reset();
    formIngredientsList.innerHTML = '<input type="text" class="form-ingredient-input" required placeholder="T.ex. Ägg">';
    formStepsList.innerHTML = '<input type="text" class="form-step-input" required placeholder="Steg 1: T.ex. Blanda smeten">';
    recipeModal.classList.add('hidden');

    // 7. Uppdatera hela appen så att det nya receptet och dess ingredienser syns direkt!
    ritaUtAvailableIngredienser();
    uppdateraReceptLista();
});

// --- INITIAL KÖRNING ---
ritaUtAvailableIngredienser();
uppdateraReceptLista(); // Körs direkt vid start så alla recept visas på 0%