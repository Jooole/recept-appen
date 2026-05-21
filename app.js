import { receptDatabas } from './recept.js';

// --- HTML ELEMENT ---
const selectionSubheader = document.getElementById('selection-subheader');
const availableIngredientsList = document.getElementById('available-ingredients-list');
const selectedSection = document.getElementById('selected-section');
const selectedIngredientsList = document.getElementById('selected-ingredients-list');
const clearAllButton = document.getElementById('clear-all-button');
const recipeSubheader = document.getElementById('recipe-subheader');
const recipesResultsContainer = document.getElementById('recipes-results-container');

// --- TILLSTÅND (STATE) ---
let valdaIngredienser = [];

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

    // Filtrera så att vi bara behåller ingredienser som INTE finns i valdaIngredienser
    const tillgangligaIngredienser = unikaIngredienser.filter(ingrediens => 
        !valdaIngredienser.includes(ingrediens)
    );

    availableIngredientsList.innerHTML = '';

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
        receptKort.className = 'recept-kort'; // Du kan styla detta i CSS sen!
        receptKort.style.marginBottom = '1.5rem';
        receptKort.style.padding = '1rem';
        receptKort.style.border = '1px solid #E2E8F0';
        receptKort.style.borderRadius = '8px';

        // Skapa rubrik med procent
        const rubrik = document.createElement('h2');
        rubrik.textContent = `${recept.namn} - ${recept.matchningsProcent}% matchning`;
        receptKort.appendChild(rubrik);

        // Visa tidskategori
        const tidInfo = document.createElement('p');
        tidInfo.className = 'subheader';
        tidInfo.textContent = `Tid: ${recept.tid}`;
        receptKort.appendChild(tidInfo);

        // Visa saknade ingredienser om det finns några (och om man har valt något överhuvudtaget)
        if (recept.matchningsProcent < 100 && valdaIngredienser.length > 0) {
            const saknasText = document.createElement('p');
            saknasText.style.color = 'var(--font-color-danger)';
            saknasText.style.fontSize = '12px';
            saknasText.style.margin = '0.5rem 0';
            saknasText.textContent = `Du saknar: ${recept.saknadeIngredienser.join(', ')}`;
            receptKort.appendChild(saknasText);
        }

        // Skapa den stegvisa instruktionslistan
        const ol = document.createElement('ol');
        ol.style.paddingLeft = '1.25rem';
        ol.style.marginTop = '0.5rem';
        recept.instruktioner.forEach(steg => {
            const li = document.createElement('li');
            li.textContent = steg;
            ol.appendChild(li);
        });
        receptKort.appendChild(ol);

        recipesResultsContainer.appendChild(receptKort);
    });
}

// --- INITIAL KÖRNING ---
ritaUtAvailableIngredienser();
uppdateraReceptLista(); // Körs direkt vid start så alla recept visas på 0%