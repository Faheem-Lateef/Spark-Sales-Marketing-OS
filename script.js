
document.addEventListener("DOMContentLoaded", () => {
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  const menu = qs(".menu-toggle");
  const nav = qs(".main-nav");
  const closeMenu = () => {
    if (!menu || !nav) return;
    nav.classList.remove("mobile-open");
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "Open menu");
  };
  if (menu && nav) {
    menu.addEventListener("click", () => {
      const open = !nav.classList.contains("mobile-open");
      nav.classList.toggle("mobile-open", open);
      menu.setAttribute("aria-expanded", String(open));
      menu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    qsa("a", nav).forEach(link => link.addEventListener("click", closeMenu));
    document.addEventListener("click", event => {
      if (!nav.contains(event.target) && !menu.contains(event.target)) closeMenu();
    });
  }

  let activeModal = null;
  let lastFocused = null;
  const focusableSelector = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function openModal(modal) {
    if (!modal) return;
    lastFocused = document.activeElement;
    activeModal = modal;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    const first = qsa(focusableSelector, modal)[0];
    first?.focus();
    if (modal.id === "videoModal") qs("video", modal)?.play().catch(() => {});
  }
  function closeModal(modal = activeModal) {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    qs("video", modal)?.pause();
    activeModal = null;
    lastFocused?.focus?.();
  }

  qsa("[data-open]").forEach(trigger => trigger.addEventListener("click", event => {
    event.preventDefault();
    openModal(qs(trigger.dataset.open));
  }));
  qsa(".modal").forEach(modal => {
    qsa(".modal-close", modal).forEach(button => button.addEventListener("click", () => closeModal(modal)));
    modal.addEventListener("mousedown", event => { if (event.target === modal) closeModal(modal); });
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && nav?.classList.contains("mobile-open")) { closeMenu(); menu.focus(); }
    if (event.key === "Escape" && activeModal) closeModal();
    if (event.key === "Tab" && activeModal) {
      const items = qsa(focusableSelector, activeModal);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  const clearFieldError = field => {
    field.removeAttribute("aria-invalid");
    field.parentElement?.querySelector(".field-error")?.remove();
  };
  const showFieldError = (field, message) => {
    clearFieldError(field);
    field.setAttribute("aria-invalid", "true");
    const node = document.createElement("span");
    node.className = "field-error";
    node.textContent = message;
    field.parentElement?.appendChild(node);
  };
  qsa("[data-consultation-form]").forEach(form => {
    const status = qs(".form-status", form);
    qsa("input,select,textarea", form).forEach(field => {
      field.addEventListener("input", () => clearFieldError(field));
      field.addEventListener("change", () => clearFieldError(field));
    });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (form.dataset.submitting === "true") return;
      let valid = true;
      qsa("input,select,textarea", form).forEach(field => {
        clearFieldError(field);
        if (!field.checkValidity()) {
          valid = false;
          const message = field.validity.valueMissing ? "This field is required."
            : field.validity.typeMismatch ? "Enter a valid email address."
            : field.validity.patternMismatch ? "Enter a valid phone number."
            : field.validity.tooShort ? `Enter at least ${field.minLength} characters.` : "Check this field.";
          showFieldError(field, message);
        }
      });
      if (!valid) {
        status.className = "form-status error";
        status.textContent = "Please check the highlighted fields.";
        qs('[aria-invalid="true"]', form)?.focus();
        return;
      }
      const submit = qs('button[type="submit"]', form);
      const original = submit.textContent;
      form.dataset.submitting = "true";
      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
      submit.textContent = "Sending…";
      status.className = "form-status";
      status.textContent = "";
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.source_page = location.pathname || "index.html";
      try {
        const response = await fetch("/api/consultation", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Submission failed.");
        status.className = "form-status success";
        status.textContent = "Thank you. Your consultation request has been received.";
        form.reset();
        setTimeout(() => closeModal(form.closest(".modal")), 1200);
      } catch {
        status.className = "form-status error";
        status.innerHTML = 'We could not submit the form right now. Please try again or <a href="https://wa.me/971566713442?text=Hi%20Spark%20AI%2C%20I%27d%20like%20a%20free%20consultation." target="_blank" rel="noopener">continue on WhatsApp</a>.';
      } finally {
        form.dataset.submitting = "false";
        submit.disabled = false;
        submit.removeAttribute("aria-busy");
        submit.textContent = original;
      }
    });
  });

  const canvas = qs("#dashCanvas");
  const dashTitle = qs("#dashTitle");
  const dashSub = qs("#dashSub");
  const inspectorTitle = qs("#inspectorTitle");
  const inspectorCopy = qs("#inspectorCopy");
  const inspectorList = qs("#inspectorList");
  const views = {
    overview:{title:"Performance Overview",sub:"See acquisition, conversations and pipeline movement in one place.",html:`<div class="kpi-grid"><div class="kpi"><span>New leads</span><strong>128</strong></div><div class="kpi"><span>Appointments</span><strong>34</strong></div><div class="kpi"><span>Open opportunities</span><strong>57</strong></div></div><div class="demo-table"><div class="demo-row head"><span>Lead</span><span>Source</span><span>Status</span></div><div class="demo-row"><span>Northstar Fitout</span><span>Meta</span><span>Booked</span></div><div class="demo-row"><span>Atlas Clinic</span><span>Website</span><span>Qualified</span></div><div class="demo-row"><span>Urban Keys</span><span>WhatsApp</span><span>Follow-up</span></div></div>`},
    leads:{title:"Lead Control",sub:"Every source feeds one customer record.",html:`<div class="demo-table"><div class="demo-row head"><span>Lead</span><span>Source</span><span>Owner</span></div><div class="demo-row"><span>BuildCo</span><span>Google</span><span>Sarah</span></div><div class="demo-row"><span>Prime Fit</span><span>Instagram</span><span>Omar</span></div><div class="demo-row"><span>Nova</span><span>WhatsApp</span><span>AI Agent</span></div></div>`},
    inbox:{title:"Unified Inbox",sub:"WhatsApp, forms and customer conversations stay together.",html:`<div class="demo-chat"><div class="demo-bubble">Hi, I need more information about your service.</div><div class="demo-bubble me">Of course. Are you looking for lead generation, sales follow-up, or both?</div><div class="demo-bubble">Both. We currently lose track of WhatsApp enquiries.</div><div class="demo-bubble me">Understood. I’ll qualify this and route it to the right owner.</div></div>`},
    pipeline:{title:"Sales Pipeline",sub:"See every opportunity and the next action.",html:`<div class="demo-kanban"><div class="demo-col">QUALIFIED<div class="demo-deal">Atlas Clinic</div><div class="demo-deal">Nova Interiors</div></div><div class="demo-col">BOOKED<div class="demo-deal">Urban Keys</div></div><div class="demo-col">PROPOSAL<div class="demo-deal">BuildCo Group</div></div></div>`},
    campaigns:{title:"Campaigns",sub:"Connect campaign activity to lead quality.",html:`<div class="kpi-grid"><div class="kpi"><span>Meta leads</span><strong>74</strong></div><div class="kpi"><span>Google leads</span><strong>39</strong></div><div class="kpi"><span>Organic</span><strong>15</strong></div></div><div class="demo-bars"><i class="bar-h-30"></i><i class="bar-h-48"></i><i class="bar-h-42"></i><i class="bar-h-69"></i><i class="bar-h-78"></i><i class="bar-h-90"></i></div>`},
    automation:{title:"Automation",sub:"Keep follow-up consistent across the customer journey.",html:`<div class="demo-flow"><div class="demo-node">New lead</div><span class="demo-arrow">→</span><div class="demo-node">Instant response</div><span class="demo-arrow">→</span><div class="demo-node">Qualify</div><span class="demo-arrow">→</span><div class="demo-node">Book</div><span class="demo-arrow">→</span><div class="demo-node">Human handoff</div></div>`},
    reports:{title:"Reports",sub:"See response, pipeline and conversion activity in one view.",html:`<div class="kpi-grid"><div class="kpi"><span>Response</span><strong>Fast</strong></div><div class="kpi"><span>Follow-up</span><strong>Active</strong></div><div class="kpi"><span>Pipeline</span><strong>Visible</strong></div></div><div class="demo-bars"><i class="bar-h-28"></i><i class="bar-h-45"></i><i class="bar-h-61"></i><i class="bar-h-57"></i><i class="bar-h-74"></i><i class="bar-h-88"></i></div>`}
  };
  const stages = {
    attract:["Attract","Track channels, campaign activity and source quality before leads reach sales.",["Performance marketing","SEO & social","Creative & content","Lead-source tracking"]],
    capture:["Capture","Turn enquiries into complete customer records.",["Landing pages","Forms","WhatsApp","CRM capture"]],
    convert:["Convert","Move leads into qualified conversations, appointments and opportunities.",["AI Agent","Lead qualification","Follow-up","Appointments & pipeline"]],
    retain:["Retain","Keep customers and dormant opportunities engaged.",["Retargeting","Reviews","Database reactivation","Long-term nurture"]]
  };
  function renderView(key) {
    if (!canvas || !views[key]) return;
    const view = views[key];
    dashTitle.textContent = view.title; dashSub.textContent = view.sub; canvas.innerHTML = view.html;
    qsa(".dash-nav").forEach(button => button.classList.toggle("active", button.dataset.view === key));
  }
  function renderStage(key) {
    if (!inspectorTitle || !stages[key]) return;
    const [title,copy,list] = stages[key];
    inspectorTitle.textContent = title; inspectorCopy.textContent = copy; inspectorList.innerHTML = list.map(item => `<li>${item}</li>`).join("");
    qsa(".stage-btn").forEach(button => button.classList.toggle("active", button.dataset.stage === key));
  }
  qsa(".dash-nav").forEach(button => button.addEventListener("click", () => renderView(button.dataset.view)));
  qsa(".stage-btn").forEach(button => button.addEventListener("click", () => renderStage(button.dataset.stage)));
  if (canvas) { renderView("overview"); renderStage("attract"); }

  // Human Agents interactive role selector
  const humanRoles = {
    growth: ["Growth Manager", "Coordinates priorities, campaigns, specialists and funnel decisions around one customer journey."],
    performance: ["Performance Marketer", "Runs and optimizes paid acquisition with conversion tracking tied back to pipeline outcomes."],
    creative: ["Creative Team", "Builds ad creative, landing-page visuals, social assets and video content around campaign goals."],
    crm: ["CRM & Automation Expert", "Keeps routing, automations, pipelines and customer history structured inside the same operating system."],
    appointments: ["Appointment Setter", "Works with AI Agent and sales teams to move qualified opportunities toward meetings and follow-up." ]
  };
  const humanTitle = qs("#humanRoleTitle");
  const humanCopy = qs("#humanRoleCopy");
  qsa(".human-role").forEach(button => {
    button.addEventListener("click", () => {
      const role = humanRoles[button.dataset.humanRole];
      if (!role || !humanTitle || !humanCopy) return;
      qsa(".human-role").forEach(item => {
        item.classList.toggle("active", item === button);
        item.setAttribute("aria-selected", item === button ? "true" : "false");
      });
      humanTitle.textContent = role[0];
      humanCopy.textContent = role[1];
      button.classList.remove("is-bouncing");
      void button.offsetWidth;
      button.classList.add("is-bouncing");
    });
  });

  // Scroll reveal + stagger for a more human, responsive feeling.
  const revealTargets = qsa("section .section-intro, .human-spotlight-shell, .handoff-promo-shell, .human-pricing-teaser, .agent-human-shell, .dashboard-shell, .final-cta-box, .cta-box");
  revealTargets.forEach(el => el.classList.add("motion-reveal"));
  const staggerGroups = qsa(".feature-grid, .result-grid, .journey-grid, .plan-grid, .team-grid, .agent-cap-grid, .hire-list, .growth-role-grid");
  staggerGroups.forEach(group => qsa(":scope > *", group).forEach((el, i) => {
    el.classList.add("motion-stagger");
    el.style.setProperty("--motion-delay", `${Math.min(i,8) * 55}ms`);
  }));
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    qsa(".motion-reveal, .motion-stagger").forEach(el => observer.observe(el));
  } else {
    qsa(".motion-reveal, .motion-stagger").forEach(el => el.classList.add("is-visible"));
  }

  // Pointer-responsive spotlight on selected premium surfaces (desktop only).
  if (window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
    qsa(".interactive-surface").forEach(surface => {
      surface.addEventListener("pointermove", event => {
        const rect = surface.getBoundingClientRect();
        surface.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
        surface.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
      });
    });
  }

});
