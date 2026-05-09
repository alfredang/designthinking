// Data-driven config for the 5 design thinking stages.
// `voting` enables an extra "important" highlight; `resolvable` allows marking a note as resolved/unresolved.
export const STAGES = [
  {
    id: "empathize",
    label: "Empathize",
    desc: "Understand your users — their needs, motivations, and context.",
    sections: [
      { id: "personas", label: "User Personas" },
      { id: "pain_points", label: "User Pain Points" },
      { id: "interview_notes", label: "Interview Notes" },
      { id: "observation_notes", label: "Observation Notes" },
      {
        id: "empathy_map",
        label: "Empathy Map",
        type: "empathy",
        quadrants: [
          { id: "says", label: "Says" },
          { id: "thinks", label: "Thinks" },
          { id: "does", label: "Does" },
          { id: "feels", label: "Feels" }
        ]
      }
    ]
  },
  {
    id: "define",
    label: "Define",
    desc: "Frame the problem clearly using insights from the empathize stage.",
    sections: [
      { id: "problem_statement", label: "Problem Statement", voting: true },
      { id: "how_might_we", label: "How Might We Questions", voting: true },
      { id: "key_insights", label: "Key Insights" },
      { id: "user_needs", label: "User Needs" },
      { id: "success_criteria", label: "Success Criteria" }
    ]
  },
  {
    id: "ideate",
    label: "Ideate",
    desc: "Generate as many ideas as possible — quantity over quality.",
    sections: [
      { id: "brainstorm", label: "Brainstorming Board", voting: true },
      { id: "crazy_8s", label: "Crazy 8s Ideas", voting: true },
      { id: "solution_sketches", label: "Solution Sketches" },
      { id: "categories", label: "Idea Categories" },
      { id: "prioritisation", label: "Voting & Prioritisation", voting: true }
    ]
  },
  {
    id: "prototype",
    label: "Prototype",
    desc: "Build something cheap and fast that brings ideas to life.",
    sections: [
      { id: "description", label: "Prototype Description" },
      { id: "screens", label: "Screens / Wireframes" },
      { id: "features", label: "Feature List" },
      { id: "user_flow", label: "User Flow" },
      { id: "assumptions", label: "Assumptions" },
      { id: "checklist", label: "Prototype Checklist" }
    ]
  },
  {
    id: "test",
    label: "Test",
    desc: "Get feedback from real users and iterate.",
    sections: [
      { id: "test_plan", label: "Test Plan" },
      { id: "user_feedback", label: "User Feedback" },
      { id: "results", label: "Test Results" },
      { id: "issues", label: "Issues Found", resolvable: true },
      { id: "improvements", label: "Improvements", resolvable: true },
      { id: "recommendations", label: "Final Recommendations" }
    ]
  }
];

export function getStage(id) {
  return STAGES.find(s => s.id === id) || STAGES[0];
}

export function getSection(stageId, sectionId) {
  const stage = getStage(stageId);
  for (const s of stage.sections) {
    if (s.id === sectionId) return s;
    if (s.type === "empathy" && s.quadrants) {
      for (const q of s.quadrants) {
        if (`${s.id}__${q.id}` === sectionId) {
          return { id: `${s.id}__${q.id}`, label: `${s.label}: ${q.label}` };
        }
      }
    }
  }
  return { id: sectionId, label: sectionId };
}

export function renderStepper(container, activeId, onSelect) {
  container.innerHTML = "";
  STAGES.forEach((stage, i) => {
    const btn = document.createElement("button");
    btn.className = "step" + (stage.id === activeId ? " active" : "");
    btn.innerHTML = `<span class="step-num">${i + 1}</span>${stage.label}`;
    btn.addEventListener("click", () => onSelect(stage.id));
    container.appendChild(btn);
  });
}

export function renderStagePanel(container, stageId, renderSection) {
  const stage = getStage(stageId);
  container.innerHTML = `
    <div class="stage-header">
      <div>
        <h2 class="stage-title">${stage.label}</h2>
        <p class="stage-desc">${stage.desc}</p>
      </div>
    </div>
    <div id="sections-host"></div>
  `;
  const host = container.querySelector("#sections-host");

  stage.sections.forEach(section => {
    const block = document.createElement("div");
    block.className = "section-block";

    if (section.type === "empathy") {
      block.innerHTML = `
        <div class="section-head">
          <h3 class="section-title">${section.label}</h3>
        </div>
        <div class="empathy-map" id="empathy-${section.id}"></div>
      `;
      const mapEl = block.querySelector(`#empathy-${section.id}`);
      section.quadrants.forEach(q => {
        const quad = document.createElement("div");
        quad.className = "empathy-quadrant";
        quad.innerHTML = `<h4>${q.label}</h4><div class="notes-grid" data-section="${section.id}__${q.id}"></div>`;
        mapEl.appendChild(quad);
        renderSection(quad.querySelector(".notes-grid"), stage.id, `${section.id}__${q.id}`, { voting: false });
      });
    } else {
      const flag = section.voting ? `<span class="vote-flag">Vote enabled</span>` : "";
      block.innerHTML = `
        <div class="section-head">
          <h3 class="section-title">${section.label}${flag}</h3>
        </div>
        <div class="notes-grid" data-section="${section.id}"></div>
      `;
      renderSection(block.querySelector(".notes-grid"), stage.id, section.id, { voting: !!section.voting, resolvable: !!section.resolvable });
    }

    host.appendChild(block);
  });
}
