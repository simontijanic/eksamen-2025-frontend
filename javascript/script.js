// API-endepunkt til backend
//const API_BASE_URL = 'http://10.12.87.101/api';
const API_BASE_URL = 'http://localhost:3000/api';

// Hent HTML-elementer fra siden
const jokeSetup = document.getElementById('jokeSetup');
const jokePunchline = document.getElementById('jokePunchline');
const reviewSection = document.getElementById('reviewSection');
const starRating = document.getElementById('starRating');
const reviewComment = document.getElementById('reviewComment');
const submitReviewBtn = document.getElementById('submitReviewBtn');
const averageRating = document.getElementById('averageRating');
const newJokeBtn = document.getElementById('newJokeBtn');
const feedbackArea = document.getElementById('feedbackArea');
const leaderMessage = document.getElementById('leaderMessage');
const toplistContainer = document.getElementById('toplistContainer');
const toastNotification = document.getElementById('toastNotification');
const toastBody = toastNotification.querySelector('.toast-body');

// Variabler for å holde styr på hvilke rever som vises og cooldown
let currentJoke = null;
let reviewSubmitted = false;
let voteCooldown = false;
const COOLDOWN_MS = 3000; // 3 sekunder mellom hver stemme

function renderStars(selected) {
    starRating.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = 'star';
        star.textContent = i <= selected ? '★' : '☆';
        star.style.fontSize = '2rem';
        star.style.cursor = 'pointer';
        star.style.color = '#ffc107';
        star.addEventListener('click', () => {
            renderStars(i);
            starRating.dataset.selected = i;
        });
        starRating.appendChild(star);
    }
    starRating.dataset.selected = selected;
}

// Hent en tilfeldig vits fra backend
async function fetchJoke() {
    jokeSetup.textContent = 'Laster vits...';
    jokePunchline.textContent = '';
    averageRating.textContent = '';
    reviewComment.value = '';
    renderStars(0);
    reviewSection.classList.remove('d-none');
    submitReviewBtn.disabled = false;
    newJokeBtn.classList.add('d-none');
    reviewSubmitted = false;
    try {
        const res = await fetch(`${API_BASE_URL}/joke`);
        if (!res.ok) throw new Error('Kunne ikke hente vits');
        currentJoke = await res.json();
        jokeSetup.textContent = currentJoke.setup;
        jokePunchline.textContent = currentJoke.punchline;
        fetchAverage(currentJoke.id);
    } catch (e) {
        jokeSetup.textContent = 'Kunne ikke hente vits.';
    }
}

// Hent og vis gjennomsnittlig vurdering for en vits
async function fetchAverage(jokeId) {
    try {
        const res = await fetch(`${API_BASE_URL}/joke/average/${jokeId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.average) {
            averageRating.textContent = `Gjennomsnittlig rating: ${data.average.toFixed(2)} (${data.count} anmeldelser)`;
        } else {
            averageRating.textContent = 'Ingen anmeldelser ennå.';
        }
    } catch {}
}

// Send inn anmeldelse for en vits
submitReviewBtn.addEventListener('click', async () => {
    const stars = Number(starRating.dataset.selected);
    const comment = reviewComment.value;
    if (!stars) {
        averageRating.textContent = 'Velg antall stjerner før du sender!';
        return;
    }
    submitReviewBtn.disabled = true;
    try {
        const res = await fetch(`${API_BASE_URL}/joke/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jokeId: currentJoke.id, stars, comment })
        });
        const data = await res.json();
        if (res.ok) {
            averageRating.textContent = `Takk for anmeldelsen! Ny gjennomsnitt: ${data.average ? data.average.toFixed(2) : 'N/A'} (${data.count} anmeldelser)`;
            reviewSection.classList.add('d-none');
            newJokeBtn.classList.remove('d-none');
            reviewSubmitted = true;
        } else {
            averageRating.textContent = data.message || 'Noe gikk galt.';
        }
    } catch {
        averageRating.textContent = 'Noe gikk galt.';
    }
});

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
        // Vis toppliste med bilde og stemmetall, penere kort og highlight for leder
        stats.toplist.slice(0, 5).forEach((fox, idx) => {
            const card = document.createElement('div');
            card.className = 'fox-card d-flex flex-column align-items-center position-relative';
            if (idx === 0) card.classList.add('fox-leader-card');
            // Crown for leader
            if (idx === 0) {
                const crown = document.createElement('span');
                crown.className = 'fox-leader-crown';
                crown.innerHTML = '👑';
                card.appendChild(crown);
            }
            const img = document.createElement('img');
            img.src = `https://randomfox.ca/images/${fox.imageId}.jpg`;
            img.alt = `Rev ${fox.imageId} med ${fox.votes} stemmer`;
            img.title = `Rev ${fox.imageId}: ${fox.votes} stemmer`;
            img.className = 'rounded border';
            img.setAttribute('aria-label', `Rev ${fox.imageId}, ${fox.votes} stemmer`);
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            card.appendChild(img);
            // Fox ID
            const foxIdLabel = document.createElement('div');
            foxIdLabel.className = 'fw-semibold mt-1';
            foxIdLabel.textContent = `Rev ${fox.imageId}`;
            card.appendChild(foxIdLabel);
            // Votes badge
            const badge = document.createElement('span');
            badge.className = 'badge bg-primary mt-1';
            badge.textContent = `Stemmer: ${fox.votes}`;
            card.appendChild(badge);
            toplistContainer.appendChild(card);
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

// Kjør når siden lastes
function setupJokePage() {
    fetchJoke();
}

document.addEventListener('DOMContentLoaded', setupJokePage);

// Koble "Ny vits"-knappen til å hente ny vits
newJokeBtn.addEventListener('click', () => {
    fetchJoke();
});
