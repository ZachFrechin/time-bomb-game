// Tab Management
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;

        // Remove active class from all buttons and panes
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));

        // Add active class to clicked button and corresponding pane
        button.classList.add('active');
        document.getElementById(targetTab).classList.add('active');

        // Store active tab in localStorage
        localStorage.setItem('activeTab', targetTab);
    });
});

// Restore last active tab
const lastActiveTab = localStorage.getItem('activeTab');
if (lastActiveTab) {
    document.querySelector(`.tab-btn[data-tab="${lastActiveTab}"]`)?.click();
}

// Search Functionality
const searchInput = document.getElementById('searchInput');
let searchTimeout;

function performSearch(query) {
    const searchableElements = document.querySelectorAll('[data-searchable]');
    const lowerQuery = query.toLowerCase();

    if (!query) {
        // Show all elements if search is empty
        searchableElements.forEach(element => {
            element.classList.remove('hidden');
            removeHighlights(element);
        });
        return;
    }

    searchableElements.forEach(element => {
        const searchText = element.dataset.searchable.toLowerCase();
        const content = element.textContent.toLowerCase();

        if (searchText.includes(lowerQuery) || content.includes(lowerQuery)) {
            element.classList.remove('hidden');
            highlightMatches(element, query);
        } else {
            element.classList.add('hidden');
            removeHighlights(element);
        }
    });

    // Auto-switch to appropriate tab based on search results
    autoSwitchTab();
}

function highlightMatches(element, query) {
    // Remove existing highlights
    removeHighlights(element);

    if (!query) return;

    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const textNodes = [];
    let node;

    while (node = walker.nextNode()) {
        textNodes.push(node);
    }

    textNodes.forEach(textNode => {
        const text = textNode.nodeValue;
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');

        if (regex.test(text)) {
            const span = document.createElement('span');
            span.innerHTML = text.replace(regex, '<span class="highlight">$1</span>');

            textNode.parentNode.replaceChild(span, textNode);
        }
    });
}

function removeHighlights(element) {
    const highlights = element.querySelectorAll('.highlight');
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
        parent.normalize();
    });
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function autoSwitchTab() {
    // Check which tab has visible results
    const tabs = ['rest', 'websocket', 'types'];

    for (const tabId of tabs) {
        const tabPane = document.getElementById(tabId);
        const visibleElements = tabPane.querySelectorAll('[data-searchable]:not(.hidden)');

        if (visibleElements.length > 0) {
            // Switch to this tab if not already active
            const currentActiveTab = document.querySelector('.tab-pane.active').id;
            if (currentActiveTab === 'overview') {
                document.querySelector(`.tab-btn[data-tab="${tabId}"]`).click();
            }
            break;
        }
    }
}

// Search input event
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch(e.target.value);
    }, 200);
});

// Keyboard shortcut for search (/)
document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
    }

    // Clear search with Escape
    if (e.key === 'Escape' && document.activeElement === searchInput) {
        searchInput.value = '';
        performSearch('');
        searchInput.blur();
    }
});

// Copy code blocks on click
document.querySelectorAll('.code-block').forEach(block => {
    block.style.cursor = 'pointer';
    block.title = 'Click to copy';

    block.addEventListener('click', () => {
        const text = block.textContent;
        navigator.clipboard.writeText(text).then(() => {
            // Show feedback
            const originalBg = block.style.background;
            block.style.background = 'rgba(39, 174, 96, 0.2)';
            block.style.transition = 'background 0.3s ease';

            setTimeout(() => {
                block.style.background = originalBg;
            }, 300);

            // Show tooltip
            showTooltip(block, 'Copied!');
        });
    });
});

function showTooltip(element, text) {
    const tooltip = document.createElement('div');
    tooltip.textContent = text;
    tooltip.style.cssText = `
        position: absolute;
        background: #27ae60;
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
        pointer-events: none;
    `;

    document.body.appendChild(tooltip);

    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';

    setTimeout(() => {
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.3s ease';
        setTimeout(() => tooltip.remove(), 300);
    }, 1000);
}

// Smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Add expand/collapse functionality for code blocks
document.querySelectorAll('.code-block').forEach(block => {
    const lines = block.textContent.split('\n');
    if (lines.length > 15) {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';

        block.parentNode.insertBefore(wrapper, block);
        wrapper.appendChild(block);

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = 'Show More';
        toggleBtn.style.cssText = `
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: #3498db;
            color: white;
            border: none;
            padding: 5px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            z-index: 10;
        `;

        block.style.maxHeight = '400px';
        block.style.overflow = 'hidden';

        let expanded = false;

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            expanded = !expanded;

            if (expanded) {
                block.style.maxHeight = 'none';
                toggleBtn.textContent = 'Show Less';
            } else {
                block.style.maxHeight = '400px';
                toggleBtn.textContent = 'Show More';
                block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });

        wrapper.appendChild(toggleBtn);
    }
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease';

    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// Track API endpoint usage (for analytics)
document.querySelectorAll('.endpoint-card, .event-card').forEach(card => {
    card.addEventListener('click', () => {
        const endpoint = card.querySelector('.path, .event-name')?.textContent;
        if (endpoint) {
            // Store in localStorage for usage stats
            const stats = JSON.parse(localStorage.getItem('apiStats') || '{}');
            stats[endpoint] = (stats[endpoint] || 0) + 1;
            localStorage.setItem('apiStats', JSON.stringify(stats));
        }
    });
});

// Show most used endpoints
function showPopularEndpoints() {
    const stats = JSON.parse(localStorage.getItem('apiStats') || '{}');
    const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (sorted.length > 0) {
        console.log('Most used endpoints:', sorted);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    showPopularEndpoints();

    // Add fade-in animation to cards
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.endpoint-card, .event-card, .type-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });
});