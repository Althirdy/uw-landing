const observerOptions = {
        root: null,
        rootMargin: "0px",
        threshold: 0.15,
      };

      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
            // For individual elements inside a section that we want to reveal independently
            entry.target
              .querySelectorAll(".reveal:not(.active)")
              .forEach((el) => {
                el.classList.add("active");
              });
          }
        });
      }, observerOptions);

      document.querySelectorAll(".reveal").forEach((el) => {
        revealObserver.observe(el);
      });

      // Handle initial state on load
      window.addEventListener("load", () => {
        const sections = document.querySelectorAll(".reveal");
        sections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          if (rect.top < window.innerHeight) {
            section.classList.add("active");
            section
              .querySelectorAll(".reveal")
              .forEach((el) => el.classList.add("active"));
          }
        });
      });