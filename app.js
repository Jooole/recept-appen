// === LÄGG TILL DETTA ALLRA HÖGST UPP I APP.JS ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Din unika Firebase-konfiguration
const firebaseConfig = {
    apiKey: "AIzaSyA_kUcz-8u5rqTtChp8QUGW88Uha72R0bY",
    authDomain: "koksassistent.firebaseapp.com",
    projectId: "koksassistent",
    storageBucket: "koksassistent.firebasestorage.app",
    messagingSenderId: "1089764018502",
    appId: "1:1089764018502:web:6b5ddab813f264bb04bd47"
};

// Starta Firebase och koppla till Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Skapa en tom lokal array där vi sparar recepten när de laddats ner från molnet
let receptDatabas = []; 
// ===============================================


// --- HTML ELEMENT ---
const selectionSubheader = document.getElementById('selection-subheader');
const availableIngredientsList = document.getElementById('available-ingredients-list');
const selectedSection = document.getElementById('selected-section');
const selectedIngredientsList = document.getElementById('selected-ingredients-list');
const clearAllButton = document.getElementById('clear-all-button');
const recipeSubheader = document.getElementById('recipe-subheader');
const recipesResultsContainer = document.getElementById('recipes-results-container');
const ingredientSearch = document.getElementById('ingredient-search');
const favToggle = document.getElementById('fav-toggle');

// Modal-element
const openModalBtn = document.getElementById('open-recipe-modal-btn'); // Knappen i headern
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
let favoritRecept = []; // Sparar ID:n på de recept som användaren gillar
let visaBaraFavoriter = false; // Håller reda på om filtret är aktivt

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
    uppdateraMobilVisaKnappStatus();
}

// 4. Uppdatera gränssnittet för valda ingredienser (Tags)
function uppdateraValdaIngredienserUI() {
    selectionSubheader.textContent = `${valdaIngredienser.length} valda`;

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

// NYTT: Aktivera eller inaktivera "Visa recept"-knappen på mobilen
function uppdateraMobilVisaKnappStatus() {
    const mobilVisaBtn = document.getElementById('mobile-show-recipes-btn');
    if (mobilVisaBtn) {
        // Om valdaIngredienser har element (längd > 0), sätt disabled till false (aktiverad)
        mobilVisaBtn.disabled = valdaIngredienser.length === 0;
    }
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
    uppdateraMobilVisaKnappStatus();
}

// 6. Rensa alla val (Clear all)
clearAllButton.addEventListener('click', () => {
    valdaIngredienser = [];
    const allCheckboxes = availableIngredientsList.querySelectorAll('input[type="checkbox"]');
    allCheckboxes.forEach(checkbox => checkbox.checked = false);
    
    uppdateraValdaIngredienserUI();
    uppdateraReceptLista(); // Uppdatera listan så att allt visar 0% igen
    ritaUtAvailableIngredienser();
    uppdateraMobilVisaKnappStatus();
});

// ========================================
// RECEPT-LOGIK (Här händer det magiska!)
// ========================================

function uppdateraReceptLista() {
    // Gör om alla valda ingredienser till små bokstäver en gång för alla inför jämförelsen
    const valdaIngredienserLow = valdaIngredienser.map(i => i.toLowerCase());

    // a) Loopa igenom alla recept och räkna ut matchningsprocent + saknade ingredienser
    let bearbetadeRecept = receptDatabas.map(recept => {
        // Kontrollera matchning oavsett stora/små bokstäver
        const matchande = recept.ingredienser.filter(ingrediens => 
            valdaIngredienserLow.includes(ingrediens.toLowerCase())
        );

        const saknade = recept.ingredienser.filter(ingrediens => 
            !valdaIngredienserLow.includes(ingrediens.toLowerCase())
        );

        let procent = 0;
        if (recept.ingredienser.length > 0) {
            procent = Math.round((matchande.length / recept.ingredienser.length) * 100);
        }

        return {
            ...recept,
            matchningsProcent: procent,
            saknadeIngredienser: saknade
        };
    });

    // NYTT: b) Om toggle-knappen är aktiverad, filtrera bort allt som inte är favoritmarkerat
    if (visaBaraFavoriter) {
        bearbetadeRecept = bearbetadeRecept.filter(recept => 
            favoritRecept.includes(recept.id)
        );
    }

    // c) Sortera listan så att högst procent hamnar först
    bearbetadeRecept.sort((a, b) => b.matchningsProcent - a.matchningsProcent);

    // d) Uppdatera subheadern för receptlistan
    recipeSubheader.textContent = `Visar ${bearbetadeRecept.length} recept baserat på dina ingredienser`;

    // e) Rendera ut recepten i HTML
    recipesResultsContainer.innerHTML = ''; 

    bearbetadeRecept.forEach(recept => {
        const receptKort = document.createElement('div');
        receptKort.className = 'recept-kort';

        let färgKlass = 'gray-match';
        if (recept.matchningsProcent >= 75) {
            färgKlass = 'green-match';
        } else if (recept.matchningsProcent >= 50) {
            färgKlass = 'yellow-match';
        }

        const headerFlex = document.createElement('div');
        headerFlex.className = 'recept-header-flex';

        // Skapa rubriken
const rubrik = document.createElement('h1'); 
rubrik.textContent = recept.namn;

// Skapa hjärt-knappen
const favBtn = document.createElement('button');
favBtn.className = 'fav-btn';

const ärFavorit = favoritRecept.includes(recept.id);
if (ärFavorit) {
    favBtn.classList.add('is-favorite');
}

favBtn.innerHTML = `
    <svg class="fav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${ärFavorit ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
`;

favBtn.addEventListener('click', () => {
    hanteraFavoritKlick(recept.id);
});

// Skapa procentbadgen
const procentBadge = document.createElement('div');
procentBadge.className = `match-badge ${färgKlass}`;
procentBadge.textContent = `${recept.matchningsProcent}%`;

// LÄGG TILL ALLT DIREKT I HEADER-FLEX (Ordningen bestämmer placeringen!)
headerFlex.appendChild(rubrik);       /* Rubrik hamnar till vänster */
headerFlex.appendChild(procentBadge); /* Procentbadgen ligger kvar längst till höger */

receptKort.appendChild(headerFlex);

        // 3. Visa saknade ingredienser om det behövs
        if (recept.matchningsProcent < 100 && valdaIngredienser.length > 0) {
            const saknadeContainer = document.createElement('div');
            saknadeContainer.className = 'saknade-container';

            const saknadeTitel = document.createElement('span');
            saknadeTitel.className = 'saknade-titel';
            saknadeTitel.textContent = 'Saknas:';
            saknadeContainer.appendChild(saknadeTitel);

            recept.saknadeIngredienser.forEach(ingrediens => {
    const badge = document.createElement('span');
    badge.className = 'saknad-badge';
    badge.textContent = ingrediens; // Endast denna rad behövs!
    saknadeContainer.appendChild(badge);
});

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

        // 5. Skapa en Footer för kortet med klockikon och tid
        const footer = document.createElement('footer');
        footer.className = 'recept-footer';

        const tidContainer = document.createElement('div');
        tidContainer.className = 'tid-container';

        tidContainer.innerHTML = `
            <svg class="tid-ikon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin='round' stroke-width='2' d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
            </svg>
            <span>${recept.tid}</span>
        `;

        footer.appendChild(tidContainer);
        
        // RÄTT PLACERING: Lägg till hjärtat i footern (det hamnar till höger om tiden)
        footer.appendChild(favBtn); 

        // Spika fast footern i själva receptkortet
        receptKort.appendChild(footer); 

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

// Öppna modalen ("Lägg till recept")
if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
        recipeModal.classList.remove('hidden');
        
        // NYTT: Göm FAB-knappen när modalen öppnas
        const fabButton = document.getElementById('mobile-footer-trigger');
        if (fabButton) {
            fabButton.style.display = 'none';
        }
    });
}

// Stäng modalen via krysset
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        recipeModal.classList.add('hidden');
        
        // NYTT: Visa FAB-knappen igen när modalen stängs (endast om vi är på mobil)
        const fabButton = document.getElementById('mobile-footer-trigger');
        if (fabButton && window.innerWidth <= 768) {
            fabButton.style.display = 'flex'; // Eftersom vi använder flex i CSS
        }
    });
}

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

// NY FUNKTION: Lägg till eller ta bort recept-id från favorit-listan
function hanteraFavoritKlick(receptId) {
    const index = favoritRecept.indexOf(receptId);
    
    if (index === -1) {
        favoritRecept.push(receptId); // Lägg till om det inte fanns
    } else {
        favoritRecept.splice(index, 1); // Ta bort om det redan fanns
    }
    
    // Rita omedelbart om listan så att hjärtat ändrar färg (eller försvinner om filtret är på)
    uppdateraReceptLista();
}

// Event listener för "Visa favoriter"-togglen
favToggle.addEventListener('change', (e) => {
    visaBaraFavoriter = e.target.checked; // Sätt till true eller false beroende på om den är ikryssad
    uppdateraReceptLista(); // Rita om listan direkt med det nya filtret!
});

// === LADDA RECEPT FRÅN DATABASEN I FIREBASE) ===
async function laddaReceptFrånFirebase() {
    try {
        // Hämta alla dokument från samlingen "recept" i din Firestore
        const querySnapshot = await getDocs(collection(db, "recept"));
        
        // Töm arrayen utifall att vi laddar om
        receptDatabas = [];
        
        // Loopa igenom allt vi fick från molnet och tryck in i vår lokala array
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            receptDatabas.push({
                id: doc.id, // Vi använder Firebases unika dokument-ID som recept-ID!
                namn: data.namn,
                tid: data.tid,
                ingredienser: data.ingredienser,
                instruktioner: data.instruktioner
            });
        });

        console.log(`Lyckades hämta ${receptDatabas.length} recept från Firebase!`);
        
        // NU när datan har landat kan vi köra igång gränssnittet!
        ritaUtAvailableIngredienser();
        uppdateraReceptLista();

    } catch (error) {
        console.error("Kunde inte hämta recept från Firebase:", error);
    }
}

// --- INITIAL KÖRNING ---
// Starta appen genom att först hämta all data från molnet!
laddaReceptFrånFirebase();

// ===================================================
// MOBIL-LOGIK (FOOTER-LIST MED EXPANDEBARA INGREDIENSER)
// ===================================================
const mobileFooterTrigger = document.getElementById('mobile-footer-trigger');
const closeIngredientsBox = document.getElementById('close-ingredients-box');
const ingredientsPanel = document.getElementById('ingredients-panel');

// Funktion för att öppna lådan
if (mobileFooterTrigger) {
    mobileFooterTrigger.addEventListener('click', () => {
        // Sätt tillbaka grundanimationen inför öppningen
        ingredientsPanel.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
        
        ingredientsPanel.classList.add('is-open');
        mobileFooterTrigger.classList.add('panel-active'); 
        document.body.style.overflow = 'hidden'; 
    });
}

// Funktion för att stänga lådan
// === UPPDATERA DENNA FUNKTION I APP.JS ===
if (closeIngredientsBox) {
    closeIngredientsBox.addEventListener('click', (e) => {
        e.stopPropagation(); 
        ingredientsPanel.classList.remove('is-open');
        mobileFooterTrigger.classList.remove('panel-active'); 
        document.body.style.overflow = ''; 
        
        // Garantera att krysset alltid kan stänga panelen oavsett om man har dragit i den innan
        ingredientsPanel.style.transform = '';
    });
}

// NYTT: Stäng lådan när man klickar på "Visa recept"-knappen i botten
const mobileShowRecipesBtn = document.getElementById('mobile-show-recipes-btn');
if (mobileShowRecipesBtn) {
    mobileShowRecipesBtn.addEventListener('click', () => {
        ingredientsPanel.classList.remove('is-open');
        mobileFooterTrigger.classList.remove('panel-active'); 
        document.body.style.overflow = ''; 
        
        // Återställ eventuella kvarhängande transform-stilar från svep-logiken
        ingredientsPanel.style.transform = '';
    });
}

// ===================================================
// SVEP-LOGIK (SWIPE TO CLOSE) FÖR INGREDIENSLÅDAN
// ===================================================
const panelHeader = ingredientsPanel.querySelector('.panel-header');
const dragHandle = ingredientsPanel.querySelector('.drag-handle');

let startY = 0;
let currentY = 0;
let isDragging = false;

// Funktion som startar när användaren sätter ner fingret på headern eller strecket
function onTouchStart(e) {
    startY = e.touches[0].clientY;
    isDragging = true;
    
    // Ta tillfälligt bort CSS-transitionen så att panelen följer fingret direkt utan fördröjning
    ingredientsPanel.style.transition = 'none';
}

// Funktion som körs hela tiden när användaren drar fingret
function onTouchMove(e) {
    if (!isDragging) return;
    
    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY; // Hur många pixlar fingret har rört sig nedåt
    
    // Tillåt bara att man drar NEDÅT (deltaY > 0)
    if (deltaY > 0) {
        ingredientsPanel.style.transform = `translateY(${deltaY}px)`;
    }
}

// Funktion som körs när användaren lyfter fingret
function onTouchEnd() {
    if (!isDragging) return;
    isDragging = false;
    
    // Sätt tillbaka CSS-transitionen så panelen animeras snyggt när vi släpper
    ingredientsPanel.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
    
    const deltaY = currentY - startY;
    
    // UX-Gräns: Om man dragit ner mer än 100px stänger vi panelen, annars återställer vi den
    if (deltaY > 200) {
        ingredientsPanel.classList.remove('is-open');
        mobileFooterTrigger.classList.remove('panel-active');
        document.body.style.overflow = '';
        ingredientsPanel.style.transform = '';
    } else {
        // Ångrat drag – glid tillbaka upp till toppen
        ingredientsPanel.style.transform = '';
    }
    
    // Nollställ positionerna inför nästa svep
    startY = 0;
    currentY = 0;
}

// Koppla touch-händelserna till både det lilla strecket och hela headern
if (panelHeader && dragHandle) {
    [panelHeader, dragHandle].forEach(element => {
        element.addEventListener('touchstart', onTouchStart, { passive: true });
        element.addEventListener('touchmove', onTouchMove, { passive: true });
        element.addEventListener('touchend', onTouchEnd);
    });
}