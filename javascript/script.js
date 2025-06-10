// API-endepunkt til backend
const API_BASE_URL = 'http://localhost:3000/api';

// Hent HTML-elementer fra siden
const foxImage1 = document.getElementById('foxImage1');
const foxImage2 = document.getElementById('foxImage2');
const voteButton1 = document.getElementById('voteButton1');
const voteButton2 = document.getElementById('voteButton2');
const feedbackArea = document.getElementById('feedbackArea');
const leaderMessage = document.getElementById('leaderMessage');
const toplistContainer = document.getElementById('toplistContainer');
const toastNotification = document.getElementById('toastNotification');
const toastBody = toastNotification.querySelector('.toast-body');

// Variabler for å holde styr på hvilke rever som vises og cooldown
let currentFox1Id = null;
let currentFox2Id = null;
let voteCooldown = false;
const COOLDOWN_MS = 3000; // 3 sekunder mellom hver stemme
let fox1Votes = 0;
let fox2Votes = 0;

// Hent to tilfeldige rever fra backend
async function fetchRandomFoxImageUrls() {
    try { // Added try-catch for network/server errors
        const response = await fetch(`${API_BASE_URL}/images`);
        if (!response.ok) throw new Error('Kunne ikke hente bilder fra server. Status: ' + response.status); // Added status code to error
        return await response.json();
    } catch (error) {
        console.error("Error fetching fox images:", error); // Log error to console
        throw error; // Re-throw to be caught by displayNewFoxes
    }
}

// Vis to nye rever og oppdater stemmetall
async function displayNewFoxes() {
    feedbackArea.classList.add('d-none');
    try {
        const images = await fetchRandomFoxImageUrls();
        currentFox1Id = images.fox1.id;
        foxImage1.src = images.fox1.url;
        foxImage1.dataset.foxId = images.fox1.id;
        foxImage1.alt = "Bilde av en tilfeldig rev"; // Added alt text
        currentFox2Id = images.fox2.id;
        foxImage2.src = images.fox2.url;
        foxImage2.dataset.foxId = images.fox2.id;
        foxImage2.alt = "Bilde av en annen tilfeldig rev"; // Added alt text
        await updateFoxVotes();         // Hent stemmer for disse bildene
    } catch (error) {
        feedbackArea.textContent = 'Kunne ikke laste inn nye rever. Sjekk nettverkstilkoblingen og prøv igjen senere.'; // More user-friendly error
        feedbackArea.classList.remove('d-none');
        feedbackArea.classList.replace('alert-success', 'alert-danger');
    }
}

// Hent og vis stemmetall for de to viste revene
async function updateFoxVotes() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        if (!response.ok) throw new Error('Kunne ikke hente statistikk. Status: ' + response.status); // Added status code
        const stats = await response.json();
        fox1Votes = 0;
        fox2Votes = 0;
        if (stats.toplist && Array.isArray(stats.toplist)) {
            for (const fox of stats.toplist) {
                if (fox.imageId === currentFox1Id) fox1Votes = fox.votes;
                if (fox.imageId === currentFox2Id) fox2Votes = fox.votes;
            }
        }
        document.getElementById('fox1Votes').textContent = fox1Votes;
        document.getElementById('fox2Votes').textContent = fox2Votes;
    } catch (e) {
        console.error("Error updating fox votes:", e); // Log error
        document.getElementById('fox1Votes').textContent = '?';
        document.getElementById('fox2Votes').textContent = '?';
        // Optionally, display a more user-friendly message in the UI for vote count errors
    }
}

// Stem på en rev
async function vote(foxId) {
    if (voteCooldown) {
        feedbackArea.textContent = `Du må vente litt før du kan stemme igjen!`;
        feedbackArea.classList.remove('d-none', 'alert-success');
        feedbackArea.classList.add('alert-warning');
        return;
    }
    voteCooldown = true;
    voteButton1.disabled = true;
    voteButton2.disabled = true;
    feedbackArea.classList.add('d-none');
    try {
        const response = await fetch(`${API_BASE_URL}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageId: foxId.toString() })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Ukjent feil ved stemming. Serveren svarte ikke som forventet.' })); // Improved error handling for non-JSON response
            throw new Error(errorData.message || 'Stemmegivning feilet. Status: ' + response.status); // Added status code
        }
        feedbackArea.textContent = `Du stemte på rev med ID ${foxId}. Takk for stemmen!`; // Clarified which fox was voted for
        feedbackArea.classList.remove('d-none', 'alert-danger', 'alert-warning');
        feedbackArea.classList.add('alert-success');
        await fetchStats(); // Oppdater statistikk
        setTimeout(() => {
            displayNewFoxes(); // Vis nye rever etter cooldown
            feedbackArea.classList.add('d-none');
            voteCooldown = false;
            voteButton1.disabled = false;
            voteButton2.disabled = false;
        }, COOLDOWN_MS);
        await updateFoxVotes();// Oppdater stemmetall direkte etter stemme
    } catch (error) {
        feedbackArea.textContent = `Feil: ${error.message}. Prøv igjen.`;
        feedbackArea.classList.remove('d-none', 'alert-success');
        feedbackArea.classList.add('alert-danger');
        voteCooldown = false;
        voteButton1.disabled = false;
        voteButton2.disabled = false;
    }
}

// Hent og vis statistikk og toppliste
async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        if (!response.ok) throw new Error('Kunne ikke hente statistikk. Status: ' + response.status); // Added status code
        const stats = await response.json();
        if (stats.leader) {
            const leaderText = `Rev ${stats.leader.imageId} er søtest akkurat nå med ${stats.leader.votes} stemmer!`;
            leaderMessage.textContent = leaderText;
            showToast(leaderText); // Vis toast med leder
        } else {
            leaderMessage.textContent = 'Ingen stemmer registrert enda.';
        }
        toplistContainer.innerHTML = '';
        // Vis toppliste med bilde og stemmetall
        stats.toplist.slice(0, 5).forEach(fox => {
            const wrapper = document.createElement('div');
            wrapper.className = 'd-flex flex-column align-items-center';
            const img = document.createElement('img');
            img.src = `https://randomfox.ca/images/${fox.imageId}.jpg`;
            img.alt = `Rev ${fox.imageId} med ${fox.votes} stemmer`;
            img.title = `Rev ${fox.imageId}: ${fox.votes} stemmer`;
            img.className = 'rounded border';
            img.setAttribute('aria-label', `Rev ${fox.imageId}, ${fox.votes} stemmer`); // Added aria-label for accessibility
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            const badge = document.createElement('span');
            badge.className = 'badge bg-primary mt-1';
            badge.textContent = `Stemmer: ${fox.votes}`;
            wrapper.appendChild(img);
            wrapper.appendChild(badge);
            toplistContainer.appendChild(wrapper);
        });
    } catch (error) {
        console.error("Error fetching stats:", error); // Log error
        leaderMessage.textContent = 'Kunne ikke laste statistikk. Sjekk nettverkstilkoblingen.'; // More user-friendly error
    }
}

// Vis toast-melding (popup)
function showToast(message) {
    toastBody.textContent = message;
    const toast = new bootstrap.Toast(toastNotification);
    toast.show();
}

// Koble knapper til stemme-funksjonen
voteButton1.addEventListener('click', () => {
    if (foxImage1.dataset.foxId) {
        vote(foxImage1.dataset.foxId);
    }
});
voteButton2.addEventListener('click', () => {
    if (foxImage2.dataset.foxId) {
        vote(foxImage2.dataset.foxId);
    }
});

// Kjør når siden lastes
// Viser to rever og statistikk
document.addEventListener('DOMContentLoaded', () => {
    displayNewFoxes();
    fetchStats();
});
