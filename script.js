// ===== INITIAL SETUP (Opening Show Removed) =====
window.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);

    // Elements
    const heroSection = document.getElementById('home');
    const codeBlock = document.querySelector('.code-block');
    const heroButtons = document.querySelectorAll('.hero-buttons .btn');
    const gradientOrbs = document.querySelectorAll('.gradient-orb');
    const navbar = document.getElementById('navbar');
    const scrollIndicator = document.querySelector('.scroll-indicator');
    const linkedinLink = document.querySelector('.linkedin-link');
    
    // Asegurar que elementos siempre sean visibles
    const themeToggle = document.getElementById('themeToggle');
    const hamburger = document.getElementById('hamburger');
    const scrollToTop = document.getElementById('scrollToTop');
    
    if (themeToggle) {
        gsap.set(themeToggle, { opacity: 1, visibility: 'visible', filter: 'none' });
    }
    if (hamburger) {
        gsap.set(hamburger, { opacity: 1, visibility: 'visible', filter: 'none' });
    }
    if (navbar) {
        gsap.set(navbar, { opacity: 1, visibility: 'visible', filter: 'none' });
    }
    if (scrollIndicator) {
        gsap.set(scrollIndicator, { opacity: 1, visibility: 'visible', filter: 'none' });
    }
    if (linkedinLink) {
        gsap.set(linkedinLink, { opacity: 1, visibility: 'visible', filter: 'none' });
    }

    // ===== FLOATING AMBIENT =====
    // Desactivado temporalmente - se activará después de la animación de entrada
    // if (codeBlock) {
    //     gsap.to(codeBlock, { y: '+=20', duration: 4, ease: 'sine.inOut', repeat: -1, yoyo: true });
    // }
    gradientOrbs.forEach((orb, index) => {
        if (orb) {
            gsap.to(orb, {
                y: `+=${15 + index * 5}`,
                duration: 5 + index * 0.5,
                ease: 'sine.inOut',
                repeat: -1,
                yoyo: true,
                delay: index * 0.5
            });
        }
    });

    /* LEGACY CODE COMMENTED OUT - Will implement full Opening Show sequence later
    // ===== OLD COMPILE INTRO CODE (DISABLED) =====
    if (false) {
        const compileConsole = document.getElementById('compileConsole');
        const consoleLine1 = document.getElementById('consoleLine1');
        // Set initial states
        gsap.set(compileConsole, { opacity: 1, scale: 0.8 });
        gsap.set([consoleLine1, consoleLine2, consoleLine3], { opacity: 1 });
        // Hero starts completely hidden
        if (heroSection) {
            gsap.set(heroSection, { opacity: 0, y: 30, zIndex: -1 });
        }
        
        masterTL
            .to(compileConsole, { scale: 1, duration: 0.5, ease: 'power2.out' })
            .to({}, { duration: 0.5 })
            .call(() => typeText(consoleLine1, 'npm install talent...', 50))
            .to({}, { duration: 1.5 })
            .call(() => typeText(consoleLine2, 'loading assets...', 40))
            .to({}, { duration: 1.2 })
            .call(() => typeText(consoleLine3, 'done.', 60))
            .to({}, { duration: 0.1 })
            // CRITICAL: Start hero appearing IMMEDIATELY and make intro background transparent
            .call(() => {
                if (heroSection) {
                    heroSection.style.zIndex = '100';
                    // Make compile-intro background transparent so hero shows through
                    if (compileIntro) {
                        compileIntro.style.background = 'transparent';
                    }
                }
            })
            .to(heroSection, {
                opacity: 1,
                y: 0,
                zIndex: 100,
                duration: 1.5,
                ease: 'power3.out'
            }, '-=0.1') // Start IMMEDIATELY when "done" appears
            // Start making compile-intro transparent while hero appears
            .to(compileIntro, {
                opacity: 0.3,
                duration: 1.5,
                ease: 'power2.out'
            }, '-=1.5') // Make intro fade while hero appears
            // Expand console to code-block (hero already visible behind transparent intro)
            .to(compileConsole, {
                scale: 1.5,
                x: '30%',
                width: '600px',
                height: '400px',
                duration: 1.5,
                ease: 'power3.inOut',
                onComplete: () => {
                    // Hero MUST be visible before hiding console
                    if (heroSection) {
                        gsap.set(heroSection, { opacity: 1, y: 0, zIndex: 100 });
                    }
                    // Ensure compile-intro is transparent
                    if (compileIntro) {
                        compileIntro.style.background = 'transparent';
                        gsap.set(compileIntro, { opacity: 0 });
                    }
                    compileConsole.style.display = 'none';
                    if (codeBlock) {
                        codeBlock.style.display = 'block';
                        gsap.set(codeBlock, { opacity: 0, scale: 0.8 });
                        gsap.to(codeBlock, { opacity: 1, scale: 1, duration: 1, ease: 'elastic.out(1, 0.5)' });
                    }
                }
            }, '-=1.4'); // Massive overlap - hero starts appearing way before zoom completes
    }

    // Buttons with elastic bounce (after hero appears)
    if (heroButtons.length > 0) {
        masterTL
            .set(heroButtons, { opacity: 0, y: 50 })
            .to(heroButtons, { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'elastic.out(1, 0.6)' }, '-=0.3');
    }

    /* LEGACY CODE COMMENTED OUT - Old compile intro references removed
    // PHASE 2: BIG BANG NEON - Name appears with flicker
    if (nameContainer && heroNameNeon && neonGlow) {
        // ... old code ...
    }
    function neonFlicker() {
        // ... old code ...
    }
    const spotlightElements = [heroNameNeon, codeBlock, ...Array.from(heroButtons || [])].filter(el => el);
    // ... old spotlight code ...
    */

    // ===== SCROLL TRIGGER: HERO SPLIT ANIMATION =====
    let splitMasksAdded = false;

    // SCROLL LISTENER DESACTIVADO - estaba causando problemas de solapamiento
    // window.addEventListener('scroll', () => {
    //     const scrollY = window.scrollY;
    //     // ... código comentado
    // }, { passive: true });

    function performHeroSplit() {
        if (!heroSection || !projectsSection) return;

        // Get hero content
        const heroContent = heroSection.querySelector('.hero-content');
        if (!heroContent) return;

        // Create masks for split effect (only if not already added)
        if (heroSection.querySelector('.hero-top-mask')) return;

        const heroTopMask = document.createElement('div');
        heroTopMask.className = 'hero-top-mask';
        heroTopMask.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 50%;
            background: var(--bg-primary);
            transform-origin: bottom;
            z-index: 1000;
        `;

        const heroBottomMask = document.createElement('div');
        heroBottomMask.className = 'hero-bottom-mask';
        heroBottomMask.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 50%;
            background: var(--bg-primary);
            transform-origin: top;
            z-index: 1000;
        `;

        // Ensure hero is positioned relatively
        const currentPosition = window.getComputedStyle(heroSection).position;
        if (currentPosition === 'static') {
            heroSection.style.position = 'relative';
        }

        heroSection.appendChild(heroTopMask);
        heroSection.appendChild(heroBottomMask);

        // Animate split (but don't set height to 0 permanently)
        gsap.to(heroTopMask, {
            scaleY: 0,
            duration: 1.2,
            ease: 'power4.inOut'
        });

        gsap.to(heroBottomMask, {
            scaleY: 0,
            duration: 1.2,
            ease: 'power4.inOut',
            onComplete: () => {
                // Only remove masks, don't hide hero permanently
                heroTopMask.remove();
                heroBottomMask.remove();
            }
        });

        // Reveal projects with stagger
        const projectCards = projectsSection.querySelectorAll('.project-card');
        gsap.from(projectCards, {
            opacity: 0,
            y: 60,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power3.out',
            delay: 0.5
        });
    }
});

// ===== LOADING SCREEN - GLITCH + TYPING EFFECT (Legacy - disabled) =====
window.addEventListener('load', () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingName = document.getElementById('loadingName');
    const loadingNameGlitch = document.getElementById('loadingNameGlitch');
    const codeParticles = document.getElementById('codeParticles');
    const heroSection = document.getElementById('home');

    const fullName = 'NASER FERNÁNDEZ';
    let currentIndex = 0;

    // Create code/binary particles background
    function createCodeParticles() {
        const codeStrings = ['0', '1', '01', '10', '0101', '1100', '1010', '0110', '1001', '< />', '{ }', '()', '[]', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', '==', '!=', '=>', '&&', '||'];
        const particleCount = 80; // Mucho más partículas
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'code-particle';
            particle.textContent = codeStrings[Math.floor(Math.random() * codeStrings.length)];
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 20 + 's';
            particle.style.animationDuration = (15 + Math.random() * 15) + 's';
            codeParticles.appendChild(particle);
        }
    }
    
    // Function to type text letter by letter with glitch effect
    function typeWithGlitch() {
        if (currentIndex < fullName.length) {
            // Add current letter to normal text
            const span = document.createElement('span');
            span.className = 'char';
            span.textContent = fullName[currentIndex] === ' ' ? '\u00A0' : fullName[currentIndex];
            loadingName.appendChild(span);
            
            // Trigger glitch effect on glitch layer
            if (currentIndex % 2 === 0) {
                loadingNameGlitch.textContent = loadingName.textContent;
                loadingNameGlitch.classList.add('active');
                setTimeout(() => {
                    loadingNameGlitch.classList.remove('active');
                }, 300);
            }
            
            // Show current letter
            setTimeout(() => {
                span.classList.add('visible');
            }, 50);
            
            currentIndex++;
            setTimeout(typeWithGlitch, 200); // Slower typing - more delay between letters
        } else {
            // All letters typed - simple fade out transition
            loadingName.classList.add('show');
            
            // Simple fade out and transition to portfolio
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                
                // Fade in hero section smoothly
                if (heroSection) {
                    heroSection.style.transition = 'opacity 1s ease, transform 1s ease';
                    setTimeout(() => {
                        heroSection.style.opacity = '1';
                        heroSection.style.transform = 'translateY(0)';
                    }, 200);
                }
                
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 1100);
            }, 1000); // Wait 1 second after typing completes, then fade out
        }
    }

    // Start code particles and typing effect
    createCodeParticles();
    setTimeout(() => {
        typeWithGlitch();
    }, 800);
});

// ===== NAVIGATION =====
const navbar = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-link');
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

// Scroll effect on navbar
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(10, 14, 39, 0.95)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.3)';
    } else {
        navbar.style.background = 'rgba(10, 14, 39, 0.8)';
        navbar.style.boxShadow = 'none';
    }
});

// Mobile menu toggle
hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// Close menu when clicking on a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
    });
});

// Active link tracking removed - now handled by showPage() function

// ===== TYPING EFFECT =====
const typingText = document.getElementById('typingText');
const roles = ['Full Stack Developer', 'Angular Specialist', 'Node.js Developer', 'React Developer'];
let roleIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeRole() {
    const currentRole = roles[roleIndex];

    if (isDeleting) {
        typingText.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typingText.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;
    }

    let typeSpeed = isDeleting ? 50 : 100;

    if (!isDeleting && charIndex === currentRole.length) {
        typeSpeed = 2000; // Pause at end
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        typeSpeed = 500; // Pause before starting new role
    }

    setTimeout(typeRole, typeSpeed);
}

// Start typing effect
setTimeout(typeRole, 1000);

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Active link on scroll
const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
    });
    
    // Update scroll progress bar
    updateScrollProgress();
});

// ===== SCROLL PROGRESS BAR =====
function updateScrollProgress() {
    const scrollProgress = document.getElementById('scrollProgress');
    
    if (!scrollProgress) return;
    
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
    scrollProgress.style.height = scrollPercent + '%';
}

// ===== STATS COUNTER =====
const statNumbers = document.querySelectorAll('.stat-number');

function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'));
    const duration = 2000; // 2 seconds
    const increment = target / (duration / 16); // 60fps
    let current = 0;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// Intersection Observer for stats
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounter(entry.target);
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

statNumbers.forEach(stat => {
    statsObserver.observe(stat);
});

// ===== SKILL BARS ANIMATION =====
const skillBars = document.querySelectorAll('.skill-progress');

const skillsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const width = entry.target.getAttribute('data-width');
            entry.target.style.width = width + '%';
            skillsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

skillBars.forEach(bar => {
    skillsObserver.observe(bar);
});

// ===== SCROLL ANIMATIONS (DISABLED - was causing overlap) =====
// Todas las animaciones de scroll desactivadas para evitar solapamiento
// Los elementos aparecerán normalmente sin animaciones
/*
setTimeout(() => {
    const fadeElements = document.querySelectorAll('.project-card, .timeline-item, .about-text, .skill-category');
    
    const visibleElements = Array.from(fadeElements).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    });

    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
                fadeObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    visibleElements.forEach(element => {
        if (window.getComputedStyle(element).opacity !== '1') {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            fadeObserver.observe(element);
        }
    });
}, 2500);
*/

// ===== PARALLAX EFFECT (DISABLED - was causing overlap issues) =====
// Parallax desactivado para evitar solapamiento de elementos
/*
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroContent = document.querySelector('.hero-content');
    
    if (heroContent) {
        heroContent.style.transform = `translateY(${scrolled * 0.1}px)`;
        heroContent.style.opacity = Math.max(0.7, 1 - scrolled / 1000);
    }
});
*/

// ===== PROJECT CARDS =====
// Removed Z-axis blur effect for clearer project visibility

// ===== PROJECT CARD TILT EFFECT =====
const projectsSection = document.getElementById('projects');
const projectCards = projectsSection ? projectsSection.querySelectorAll('.project-card') : [];

if (projectCards.length > 0) {
    projectCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

// ===== CONTACT FORM =====
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;

    // Create mailto link
    const mailtoLink = `mailto:Naserfer97@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Nombre: ${name}\nEmail: ${email}\n\nMensaje:\n${message}`)}`;
    
    // Open email client
    window.location.href = mailtoLink;
    
    // Reset form
    contactForm.reset();
    
    // Show success message (optional)
    showNotification('¡Mensaje enviado! Tu cliente de correo se abrirá ahora.');
});

// ===== NOTIFICATION SYSTEM =====
// Notification system is implemented below in the game section with queue management

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===== CURSOR EFFECT (Optional - can be removed if not needed) =====
// Custom cursor effect for desktop
let cursor = null;

if (window.innerWidth > 768) {
    cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.style.cssText = `
        width: 20px;
        height: 20px;
        border: 2px solid #00d4ff;
        border-radius: 50%;
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        transition: transform 0.1s ease;
        display: none;
    `;
    document.body.appendChild(cursor);

    document.addEventListener('mousemove', (e) => {
        cursor.style.display = 'block';
        cursor.style.left = e.clientX - 10 + 'px';
        cursor.style.top = e.clientY - 10 + 'px';
    });

    // Cursor hover effect on interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .project-card, .tech-tag');
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            cursor.style.transform = 'scale(1.5)';
            cursor.style.borderColor = '#6c5ce7';
        });
        element.addEventListener('mouseleave', () => {
            cursor.style.transform = 'scale(1)';
            cursor.style.borderColor = '#00d4ff';
        });
    });
}

// ===== LOADING ANIMATION =====
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// ===== SCROLL TO TOP BUTTON (Optional enhancement) =====
const scrollTopBtn = document.createElement('button');
scrollTopBtn.innerHTML = '↑';
scrollTopBtn.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00d4ff, #6c5ce7);
    color: #0a0e27;
    border: none;
    font-size: 24px;
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0, 212, 255, 0.4);
`;
document.body.appendChild(scrollTopBtn);

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollTopBtn.style.opacity = '1';
        scrollTopBtn.style.visibility = 'visible';
    } else {
        scrollTopBtn.style.opacity = '0';
        scrollTopBtn.style.visibility = 'hidden';
    }
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

scrollTopBtn.addEventListener('mouseenter', () => {
    scrollTopBtn.style.transform = 'scale(1.1) translateY(-5px)';
});

scrollTopBtn.addEventListener('mouseleave', () => {
    scrollTopBtn.style.transform = 'scale(1) translateY(0)';
});

// ===== PERFORMANCE OPTIMIZATION =====
// Debounce function for scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Optimize scroll events
const optimizedScrollHandler = debounce(() => {
    // Scroll-dependent code here
}, 10);

window.addEventListener('scroll', optimizedScrollHandler, { passive: true });

// ===== PARTICLE SYSTEM =====
function initParticles() {
    const particlesContainer = document.getElementById('particles');
    
    if (!particlesContainer) {
        console.warn('Particles container not found, retrying...');
        setTimeout(initParticles, 100);
        return;
    }
    
    function createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 4 + 2;
        const x = Math.random() * window.innerWidth;
        const duration = Math.random() * 10 + 10;
        const delay = Math.random() * 5;
        
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = x + 'px';
        particle.style.animationDuration = duration + 's';
        particle.style.animationDelay = delay + 's';
        particle.style.backgroundColor = Math.random() > 0.5 ? '#00d4ff' : '#6c5ce7';
        
        particlesContainer.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
            }
        }, (duration + delay) * 1000);
    }
    
    // Create initial particles
    for (let i = 0; i < 20; i++) {
        setTimeout(() => createParticle(), i * 100);
    }
    
    // Create particles continuously
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            createParticle();
        }
    }, 300);
}

// Initialize particles when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initParticles);
} else {
    initParticles();
}

// ===== GLITCH EFFECT ON RANDOM =====
const glitchOverlay = document.querySelector('.glitch-overlay');

setInterval(() => {
    if (Math.random() > 0.7) {
        glitchOverlay.style.animation = 'none';
        setTimeout(() => {
            glitchOverlay.style.animation = 'glitch 0.3s';
        }, 10);
    }
}, 5000);

// ===== THEME TOGGLE (Dark/Light Mode) =====
const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'dark';

document.documentElement.setAttribute('data-theme', currentTheme);
if (currentTheme === 'light') {
    document.body.classList.add('light-mode');
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Animate toggle
    themeToggle.style.transform = 'rotate(360deg) scale(1.1)';
    setTimeout(() => {
        themeToggle.style.transform = 'rotate(0deg) scale(1)';
    }, 300);
});

// ===== ADVANCED CURSOR EFFECT =====
if (window.innerWidth > 768) {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);
    
    const cursorTrail = document.createElement('div');
    cursorTrail.className = 'custom-cursor-trail';
    document.body.appendChild(cursorTrail);
    
    let cursorX = 0, cursorY = 0;
    let trailX = 0, trailY = 0;
    
    document.addEventListener('mousemove', (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;
    });
    
    function animateCursor() {
        // Main cursor
        cursor.style.left = cursorX - 10 + 'px';
        cursor.style.top = cursorY - 10 + 'px';
        
        // Trail (with delay)
        trailX += (cursorX - trailX) * 0.1;
        trailY += (cursorY - trailY) * 0.1;
        cursorTrail.style.left = trailX - 5 + 'px';
        cursorTrail.style.top = trailY - 5 + 'px';
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();
    
    // Cursor effects on hover
    const interactiveElements = document.querySelectorAll('a, button, .project-card, .tech-tag, .nav-link');
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            cursor.style.transform = 'scale(2)';
            cursor.style.borderColor = '#6c5ce7';
            cursor.style.boxShadow = '0 0 30px #6c5ce7, 0 0 60px #00d4ff';
        });
        element.addEventListener('mouseleave', () => {
            cursor.style.transform = 'scale(1)';
            cursor.style.borderColor = '#00d4ff';
            cursor.style.boxShadow = '0 0 20px #00d4ff, 0 0 40px #6c5ce7';
        });
    });
}

// ===== SCROLL-BASED ANIMATIONS (DISABLED - was causing overlap) =====
// Desactivado completamente para evitar solapamiento
/*
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            
            if (entry.target.classList.contains('project-card')) {
                entry.target.addEventListener('mousemove', (e) => {
                    const rect = entry.target.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    
                    const rotateX = (y - centerY) / 20;
                    const rotateY = (centerX - x) / 20;
                    
                    entry.target.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
                });
                
                entry.target.addEventListener('mouseleave', () => {
                    entry.target.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
                });
            }
        }
    });
}, observerOptions);

document.querySelectorAll('.project-card, .timeline-item, .skill-category').forEach(el => {
    scrollObserver.observe(el);
});
*/

// ===== GRADIENT BACKGROUND ANIMATION =====
function animateGradient() {
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        let hue = 0;
        setInterval(() => {
            hue = (hue + 0.5) % 360;
            heroSection.style.filter = `hue-rotate(${hue}deg)`;
        }, 100);
    }
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.95), rgba(108, 92, 231, 0.95));
        color: var(--bg-primary);
        padding: 16px 24px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0, 212, 255, 0.4);
        animation: slideInRight 0.3s ease;
        font-family: 'JetBrains Mono', monospace;
        max-width: 350px;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// ===== GSAP ENTRY TIMELINE (Immediate - No Opening Show) =====
window.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 DOM Loaded - Initializing animations...');

    // Start immediately - no delay
    const codeBlock = document.querySelector('.code-block');
    const heroName = document.querySelector('.hero-name');
    const heroGreeting = document.querySelector('.hero-greeting');
    const heroBackground = document.querySelector('.hero-background');

    if (!heroName) {
        console.warn('❌ Hero name not found');
        return;
    }

    console.log('✅ Elements found, starting timeline...');

    // Asegurar que el greeting sea visible
    if (heroGreeting) {
        gsap.set(heroGreeting, { opacity: 1, visibility: 'visible' });
    }
    
    // Asegurar que el code-block sea visible y estático desde el inicio
    if (codeBlock) {
        // Matar cualquier animación activa en el code-block
        gsap.killTweensOf(codeBlock);
        
        gsap.set(codeBlock, { 
            opacity: 1, 
            filter: 'blur(0px)', 
            y: 0, 
            x: 0,
            scale: 1,
            rotation: 0,
            visibility: 'visible',
            clearProps: 'all' // Limpiar todas las propiedades animadas
        });
        
        // Prevenir cualquier animación futura que pueda moverlo
        codeBlock.style.transform = 'none';
        codeBlock.style.willChange = 'auto';
    }

    // Get text content BEFORE modifying
    const nameText = heroName.textContent.trim();
    
    // Clear and split into characters
    heroName.innerHTML = '';
    
    nameText.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        span.style.transform = 'translateY(20px)';
        heroName.appendChild(span);
    });

    // ===== TIMELINE: Code Block + Split Text (Starts immediately) =====
    const entryTL = gsap.timeline({ 
        delay: 0.1, // Muy pequeño delay para que todo esté listo
        onStart: () => console.log('▶️ Timeline started')
    });

    // Phase 1: Show heroName container and greeting immediately
    entryTL.set([heroName, heroGreeting].filter(el => el), { 
        opacity: 1, 
        visibility: 'visible' 
    }, 0);

    // Phase 2: Animate split text - "Naser Fernández" letter by letter (fast)
    const nameSpans = heroName.querySelectorAll('span');
    nameSpans.forEach((span, index) => {
        entryTL.to(span, {
            opacity: 1,
            y: 0,
            duration: 0.2,
            ease: 'back.out(1.7)',
        }, index * 0.02); // Stagger más rápido - 0.02s por letra
    });

    // Phase 3: Code-block - Primero asegurar que esté visible, luego activar floating
    if (codeBlock) {
        // Matar cualquier animación que pueda estar corriendo
        gsap.killTweensOf(codeBlock);
        
        // Asegurar que el code-block esté completamente visible y en posición inicial
        gsap.set(codeBlock, { 
            scale: 1, 
            opacity: 1, 
            y: 0, 
            x: 0,
            rotation: 0
        });
        
        // Esperar un momento para que se estabilice, luego activar floating
        setTimeout(() => {
            // Activar floating AMBIENT - movimiento suave y continuo
            gsap.to(codeBlock, { 
                y: '+=20', 
                duration: 4, 
                ease: 'sine.inOut', 
                repeat: -1, 
                yoyo: true 
            });
            console.log('✅ Code block floating activated');
        }, 500); // Esperar 0.5s después de que aparezca para que se estabilice
    }
    
    console.log('✅ Split text created for:', nameText);
});

// ===== IMMERSIVE SCROLL EXPERIENCE =====
(function initImmersiveScroll() {
    'use strict';
    
    // Wait for DOM and GSAP to be ready
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.warn('GSAP or ScrollTrigger not loaded');
        return;
    }

    // ===== 1. LENIS SMOOTH SCROLL (DISABLED - causing conflicts) =====
    // Lenis disabled temporarily to fix conflicts with existing scroll handlers
    /*
    let lenis;
    if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1,
            smoothTouch: false,
            touchMultiplier: 2,
            infinite: false
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        lenis.on('scroll', ScrollTrigger.update);
    }
    */

    // ===== 2. SCROLL PROGRESS ENHANCED =====
    const scrollProgress = document.getElementById('scrollProgress');
    const scrollProgressContainer = document.querySelector('.scroll-progress-container');
    
    // Scroll progress desactivado temporalmente para evitar conflictos
    /*
    if (scrollProgress && scrollProgressContainer) {
        gsap.to(scrollProgress, {
            height: '100%',
            ease: 'none',
            scrollTrigger: {
                trigger: document.body,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.5
            }
        });

        ScrollTrigger.create({
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
                const progress = self.progress;
                scrollProgress.style.boxShadow = `0 0 ${20 + progress * 30}px rgba(0, 212, 255, ${0.3 + progress * 0.5})`;
            }
        });
    }
    */

    // ===== 3. PARALLAX MULTI-LAYER (DISABLED - was causing overlap) =====
    // Parallax desactivado completamente para evitar solapamiento
    /*
    const heroBackground = document.querySelector('.hero-background');
    const gradientOrbs = document.querySelectorAll('.gradient-orb');
    const heroContent = document.querySelector('.hero-content');
    
    if (heroBackground) {
        gsap.to(heroBackground, {
            y: 100,
            ease: 'none',
            scrollTrigger: {
                trigger: heroBackground,
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            }
        });
    }

    gradientOrbs.forEach((orb, index) => {
        gsap.to(orb, {
            y: 50 * (index % 2 === 0 ? 1 : -1),
            x: 30 * (index % 3 === 0 ? 1 : -1),
            ease: 'none',
            scrollTrigger: {
                trigger: document.body,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 1
            }
        });
    });
    */

    // ===== 4. SECTION REVEAL ANIMATIONS (Simplified - only if elements exist and are visible) =====
    
    // Wait a bit for page to load before setting up scroll animations
    setTimeout(() => {
        // TODAS LAS ANIMACIONES DE SCROLL DESACTIVADAS para evitar solapamiento
        // Las secciones aparecerán normalmente sin animaciones de scroll
        /*
        const aboutSection = document.getElementById('about');
        const aboutText = aboutSection?.querySelector('.about-text');
        if (aboutText && aboutText.offsetParent !== null) {
            gsap.from(aboutText, {
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: aboutSection,
                    start: 'top 80%',
                    toggleActions: 'play none none reverse',
                    once: true
                }
            });
        }

        const skillCategories = document.querySelectorAll('.skill-category');
        skillCategories.forEach((category, index) => {
            if (category.offsetParent !== null) {
                gsap.from(category, {
                    rotationY: 30,
                    opacity: 0,
                    scale: 0.9,
                    duration: 0.8,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: category,
                        start: 'top 85%',
                        toggleActions: 'play none none reverse',
                        once: true
                    }
                });
            }
        });

        const projectCards = document.querySelectorAll('.project-card');
        projectCards.forEach((card, index) => {
            if (card.offsetParent !== null) {
                gsap.from(card, {
                    opacity: 0,
                    duration: 0.6,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: card,
                        start: 'top 85%',
                        toggleActions: 'play none none reverse',
                        once: true
                    }
                });
            }
        });

        const timelineItems = document.querySelectorAll('.timeline-item');
        timelineItems.forEach((item, index) => {
            if (item.offsetParent !== null) {
                gsap.from(item, {
                    opacity: 0,
                    duration: 0.6,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: item,
                        start: 'top 85%',
                        toggleActions: 'play none none reverse',
                        once: true
                    }
                });
            }
        });
        */
    }, 2000); // Wait 2s after page load

    // ===== 5. SCROLL-BASED TRANSFORMATIONS (Simplified) =====
    
    // Navbar - Glassmorphism on scroll (NO afectar opacity - solo clases CSS)
    const navbar = document.getElementById('navbar');
    if (navbar) {
        // Asegurar que navbar siempre sea visible
        gsap.set(navbar, { opacity: 1, visibility: 'visible' });
        
        ScrollTrigger.create({
            trigger: document.body,
            start: 'top -100',
            onEnter: () => navbar.classList.add('scrolled'),
            onLeaveBack: () => navbar.classList.remove('scrolled')
        });
    }
    
    // Asegurar que theme toggle, hamburger y scroll-to-top siempre sean visibles
    const themeToggle = document.getElementById('themeToggle');
    const hamburger = document.getElementById('hamburger');
    const scrollToTop = document.getElementById('scrollToTop');
    
    [themeToggle, hamburger].forEach(el => {
        if (el) {
            // Forzar visibilidad permanente
            gsap.set(el, { opacity: 1, visibility: 'visible', filter: 'none', clearProps: 'all' });
            // Proteger contra animaciones futuras
            el.style.opacity = '1';
            el.style.visibility = 'visible';
            el.style.filter = 'none';
        }
    });
    
    // Scroll-to-top se maneja por su propio listener de scroll, pero asegurar visibilidad inicial
    if (scrollToTop) {
        // El scroll-to-top se muestra/oculta según scroll, pero asegurar que no se oculte permanentemente
        const originalScrollHandler = () => {
            if (window.pageYOffset > 300) {
                scrollToTop.style.opacity = '1';
                scrollToTop.style.visibility = 'visible';
            } else {
                scrollToTop.style.opacity = '0';
                scrollToTop.style.visibility = 'hidden';
            }
        };
        // Ya hay un listener de scroll para esto más abajo, pero asegurar que funcione
    }

    // Hero Name - NO animar en scroll para evitar solapamiento
    // Desactivado completamente - las animaciones de scroll causan solapamiento
    // Código comentado para referencia:
    /*
    setTimeout(() => {
        const heroName = document.querySelector('.hero-name');
        if (heroName && heroName.offsetParent !== null) {
            gsap.to(heroName, {
                opacity: 0.3,
                ease: 'power1.out',
                scrollTrigger: {
                    trigger: document.body,
                    start: '200px top',
                    end: '500px top',
                    scrub: 1
                }
            });
        }
    }, 3000);
    */

    // ===== 6. COLOR TRANSITIONS BETWEEN SECTIONS (Disabled - was causing issues) =====
    // Color transitions disabled to avoid visual conflicts

    // ===== 7. PERFORMANCE OPTIMIZATION =====
    // Simplified - will-change added only when needed by GSAP animations
    
    console.log('✅ Immersive Scroll Experience initialized (simplified)');
})();

// ===== CONSOLE MESSAGE =====
console.log('%c👋 ¡Hola! ¿Interesado en ver el código?', 'color: #00d4ff; font-size: 16px; font-weight: bold;');
console.log('%cLinkedIn: linkedin.com/in/naser-fernandez-mancia-67b841289', 'color: #6c5ce7; font-size: 12px;');
console.log('%cPortfolio desarrollado con ❤️ usando HTML, CSS y JavaScript vanilla', 'color: #a0aec0; font-size: 10px;');
console.log('%c✨ Efectos vanguardistas 2026: Partículas, Glitch, 3D, Dark Mode, Smooth Scroll', 'color: #a29bfe; font-size: 10px;');

