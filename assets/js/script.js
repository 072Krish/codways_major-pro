const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => {
        navLinks.classList.toggle("active");

        const icon = menuBtn.querySelector("i");

        if (navLinks.classList.contains("active")) {
            icon.classList.remove("fa-bars");
            icon.classList.add("fa-xmark");
        } else {
            icon.classList.remove("fa-xmark");
            icon.classList.add("fa-bars");
        }
    });
}

const navItems = document.querySelectorAll(".nav-links a");

navItems.forEach(link => {
    link.addEventListener("click", () => {

        if (navLinks) {
            navLinks.classList.remove("active");
        }

        if (menuBtn) {
            const icon = menuBtn.querySelector("i");

            if (icon) {
                icon.classList.remove("fa-xmark");
                icon.classList.add("fa-bars");
            }
        }

    });
});

// ===============================
// ANIMATED STATS COUNTER
// ===============================

const counters = document.querySelectorAll("[data-count]");

const startCounter = (counter) => {
    const target = Number(counter.getAttribute("data-count"));
    const duration = 1600;
    const stepTime = 16;
    const totalSteps = duration / stepTime;
    const increment = target / totalSteps;

    let current = 0;

    const updateCounter = () => {
        current += increment;

        if (current < target) {
            counter.textContent = Math.floor(current).toLocaleString("en-IN");
            requestAnimationFrame(updateCounter);
        } else {
            counter.textContent = target.toLocaleString("en-IN");

            if (target === 850000) {
                counter.textContent = "₹" + target.toLocaleString("en-IN");
            }
        }
    };

    updateCounter();
};

const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            startCounter(entry.target);
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.4
});

counters.forEach(counter => {
    counterObserver.observe(counter);
});

// ===============================
// FAQ ACCORDION
// ===============================

const faqItems = document.querySelectorAll(".faq-item");

if (faqItems.length > 0) {

    faqItems.forEach(item => {

        const question = item.querySelector(".faq-question");

        if (question) {
            question.addEventListener("click", () => {

                faqItems.forEach(faq => {
                    if (faq !== item) {
                        faq.classList.remove("active");
                    }
                });

                item.classList.toggle("active");

            });
        }

    });

}

// ===============================
// SCROLL REVEAL
// ===============================

const sections = document.querySelectorAll(
    ".hero, .trusted, .stats-section, .features, .testimonials, .faq-section, .insights, .footer"
);

const observer = new IntersectionObserver((entries) => {

    entries.forEach(entry => {

        if (entry.isIntersecting) {
            entry.target.classList.add("show");
        }

    });

}, {
    threshold: 0.15
});

sections.forEach(section => observer.observe(section));