document.addEventListener('DOMContentLoaded', function () {
    const app = {
        init() {
            this.initGSAP();
            this.initCarousel();
            this.initLocationPopups();
            this.initSocialLinks();
            this.initMobileMenu();
        },

        // GSAP 动画初始化
        initGSAP() {
            try {
                gsap.registerPlugin(ScrollTrigger);

                // Hero 动画
                const heroContent = document.querySelector('.hero-content');
                if (heroContent) {
                    gsap.from(heroContent, {
                        opacity: 0,
                        y: 50,
                        duration: 1,
                        ease: 'power3.out'
                    });
                }

                // 产品动画
                this.animateProducts();

                // 数据统计动画
                this.animateStats();

                // 客户故事动画
                this.animateStories();
            } catch (error) {
                console.error('GSAP animation error:', error);
            }
        },

        // 产品动画
        animateProducts() {
            const productItems = document.querySelectorAll('.product-item');
            if (productItems.length) {
                gsap.from(productItems, {
                    scrollTrigger: {
                        trigger: '.product-showcase',
                        start: 'top 80%'
                    },
                    opacity: 0,
                    y: 50,
                    stagger: 0.3,
                    duration: 1,
                    ease: 'power3.out'
                });
            }
        },

        // 数据统计动画
        animateStats() {
            const statElements = document.querySelectorAll('.stat-number');
            if (!statElements.length) return;

            statElements.forEach(stat => {
                const finalValue = stat.textContent;
                gsap.from(stat, {
                    scrollTrigger: {
                        trigger: '.stats-grid',
                        start: 'top 80%'
                    },
                    textContent: "0",
                    duration: 2,
                    ease: "power1.out",
                    snap: { textContent: 1 },
                    onUpdate: function () {
                        this.updateStatValue(finalValue, this.progress(), stat);
                    }.bind(this)
                });
            });
        },

        // 更新统计数值
        updateStatValue(finalValue, progress, element) {
            const value = Math.round(progress * parseFloat(finalValue));
            if (finalValue.includes('%')) {
                element.textContent = `${value}%`;
            } else if (finalValue.includes('K')) {
                element.textContent = `${value}K+`;
            } else if (finalValue.includes('M')) {
                element.textContent = `${value}M+`;
            }
        },

        // 轮播功能初始化
        initCarousel() {
            const carousel = {
                container: document.querySelector('.stories-grid'),
                items: document.querySelectorAll('.story-item'),
                prevBtn: document.querySelector('.prev-button'),
                nextBtn: document.querySelector('.next-button'),
                currentIndex: 0,
                itemsPerView: window.innerWidth <= 768 ? 1 : 3,

                init() {
                    if (!this.items.length) return;
                    
                    // 初始化显示
                    this.showStories(0);
                    
                    // 绑定按钮事件
                    if (this.prevBtn) {
                        this.prevBtn.addEventListener('click', () => this.prev());
                    }
                    if (this.nextBtn) {
                        this.nextBtn.addEventListener('click', () => this.next());
                    }

                    // 响应式处理
                    window.addEventListener('resize', () => {
                        this.itemsPerView = window.innerWidth <= 768 ? 1 : 3;
                        this.showStories(this.currentIndex);
                    });
                },

                showStories(startIndex) {
                    // 重置所有项目
                    this.items.forEach(item => {
                        item.style.display = 'none';
                        item.classList.remove('active');
                    });

                    // 显示当前视图的项目
                    for (let i = 0; i < this.itemsPerView; i++) {
                        const index = (startIndex + i) % this.items.length;
                        const item = this.items[index];
                        if (item) {
                            item.style.display = 'block';
                            requestAnimationFrame(() => {
                                item.classList.add('active');
                            });
                        }
                    }

                    this.currentIndex = startIndex;
                },

                next() {
                    const nextIndex = (this.currentIndex + this.itemsPerView) % this.items.length;
                    this.showStories(nextIndex);
                },

                prev() {
                    const prevIndex = (this.currentIndex - this.itemsPerView + this.items.length) % this.items.length;
                    this.showStories(prevIndex);
                }
            };

            carousel.init();
        },

        // 位置弹窗初始化
        initLocationPopups() {
            const locationTriggers = document.querySelectorAll('.location-trigger');

            locationTriggers.forEach(trigger => {
                const mapPopup = trigger.querySelector('.map-popup');
                if (!mapPopup) return;

                const showPopup = () => mapPopup.style.display = 'block';
                const hidePopup = () => mapPopup.style.display = 'none';

                trigger.addEventListener('mouseenter', showPopup);
                trigger.addEventListener('mouseleave', hidePopup);

                mapPopup.addEventListener('click', e => e.stopPropagation());
            });

            document.addEventListener('click', e => {
                if (!e.target.closest('.location-trigger')) {
                    document.querySelectorAll('.map-popup')
                        .forEach(popup => popup.style.display = 'none');
                }
            });
        },

        // 社交链接初始化
        initSocialLinks() {
            document.querySelectorAll('.social-icons a').forEach(icon => {
                icon.addEventListener('click', e => {
                    e.preventDefault();
                    const url = icon.getAttribute('href');
                    if (url) window.open(url, '_blank');
                });
            });
        },

        // 移动端菜单初始化
        initMobileMenu() {
            const navLinks = document.querySelector('.nav-links');
            const menuToggle = document.querySelector('.menu-toggle');

            if (!navLinks || !menuToggle) return;

            const toggleMenu = () => {
                navLinks.classList.toggle('active');
                menuToggle.innerHTML = navLinks.classList.contains('active')
                    ? '<i class="fas fa-times"></i>'
                    : '<i class="fas fa-bars"></i>';
            };

            menuToggle.addEventListener('click', toggleMenu);

            document.addEventListener('click', e => {
                if (!navLinks.contains(e.target) && !menuToggle.contains(e.target) && navLinks.classList.contains('active')) {
                    toggleMenu();
                }
            });

            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', toggleMenu);
            });
        }
    };

    // 初始化应用
    app.init();

    // 暗黑模式切换
    const toggleDarkMode = () => {
        document.documentElement.classList.toggle('dark-mode');
    };

    document.querySelector('.dark-mode-toggle').addEventListener('click', toggleDarkMode);
}); 