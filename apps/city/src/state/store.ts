/**
 * City state, derived entirely from the event stream.
 *
 * There is no other input. Nothing here invents an agent, a task, a swarm or a birth — every
 * entity in this state exists because an event said it does, and carries the sequence number
 * of the event that created it. That is Article 9 implemented rather than asserted: to draw
 * something that is not happening, you would first have to fabricate an event, and the bus
 * would record that as a violation.
 */

import type { CityEvent, District, GateStatus, ReleaseManifest, TaskState } from "@agent-city/core";

export interface AgentView {
  readonly id: string;
  district: District | string;
  activity: string;
  detail: string | null;
  taskId: string | null;
  /** True for the fifteen founding residents; false for anyone born during the run. */
  resident: boolean;
  /** Sequence number of the event that first put this agent on the map. */
  since: number;
  /** Set while the agent is travelling, so the renderer can interpolate honestly. */
  travel: { from: District | string; to: District | string; startedSeq: number } | null;
}

export interface TaskView {
  readonly id: string;
  title: string;
  owner: string;
  state: TaskState;
  cycles: number;
  workClass: string;
  route: string | null;
  workers: number;
  dependsOn: readonly string[];
  waitingOn: readonly string[];
  artifacts: { id: string; kind: string; summary: string }[];
  verdicts: { verifier: string; method: string; passed: boolean; summary: string }[];
  blockedReason: string | null;
}

export interface SwarmView {
  readonly id: string;
  lead: string;
  workers: number;
  question: string;
  model: string;
  reported: number;
  sources: number;
  contradictions: string[];
  synthesized: boolean;
  dissolved: boolean;
}

export interface FlowView {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly kind: "message" | "verification" | "repair" | "assignment";
  readonly seq: number;
  readonly label: string;
}

export interface GenesisView {
  readonly genomeId: string;
  name: string;
  stage: string;
  bay: string | null;
  mentor: string | null;
  trials: { trial: string; score: number; threshold: number; passed: boolean }[];
  adversarial: { reviewer: string; passed: boolean; findings: string[] }[];
  agentId: string | null;
  rationale: string | null;
}

export interface CityState {
  readonly agents: ReadonlyMap<string, AgentView>;
  readonly tasks: ReadonlyMap<string, TaskView>;
  readonly swarms: ReadonlyMap<string, SwarmView>;
  readonly genesis: ReadonlyMap<string, GenesisView>;
  readonly gates: ReadonlyMap<string, { status: GateStatus; owner: string; detail: string }>;
  /** Recent inter-agent flows, for the neural map and the city's light streams. */
  readonly flows: readonly FlowView[];
  readonly log: readonly CityEvent[];
  readonly objective: string | null;
  readonly mode: "live" | "rehearsal" | null;
  readonly degradations: readonly { capability: string; consequence: string }[];
  readonly violations: readonly { article: string; subject: string; detail: string }[];
  readonly release: { decision: "approved" | "blocked"; outstanding: readonly string[] } | null;
  readonly manifest: ReleaseManifest | null;
  readonly lastSeq: number;
  /** True when the client detected a hole in the sequence. The UI must say so, not smooth it. */
  readonly gap: boolean;
  readonly finished: boolean;
}

export const EMPTY_STATE: CityState = {
  agents: new Map(),
  tasks: new Map(),
  swarms: new Map(),
  genesis: new Map(),
  gates: new Map(),
  flows: [],
  log: [],
  objective: null,
  mode: null,
  degradations: [],
  violations: [],
  release: null,
  manifest: null,
  lastSeq: 0,
  gap: false,
  finished: false,
};

const MAX_LOG = 400;
const MAX_FLOWS = 40;

/** The founding residents. Anyone else on the map was born during the run. */
const FOUNDING = new Set([
  "atlas", "verity", "nova", "sol", "iris", "kinetic", "rune", "vector",
  "aegis", "argus", "flux", "mercy", "nyx", "mnemos", "pax",
]);

function agent(agents: Map<string, AgentView>, id: string, seq: number, home?: District | string): AgentView {
  let a = agents.get(id);
  if (!a) {
    a = {
      id,
      district: home ?? "command-spire",
      activity: "idle",
      detail: null,
      taskId: null,
      resident: FOUNDING.has(id),
      since: seq,
      travel: null,
    };
    agents.set(id, a);
  }
  return a;
}

function task(tasks: Map<string, TaskView>, id: string): TaskView {
  let t = tasks.get(id);
  if (!t) {
    t = {
      id,
      title: id,
      owner: "atlas",
      state: "planned",
      cycles: 0,
      workClass: "implementation",
      route: null,
      workers: 0,
      dependsOn: [],
      waitingOn: [],
      artifacts: [],
      verdicts: [],
      blockedReason: null,
    };
    tasks.set(id, t);
  }
  return t;
}

function flow(from: string, to: string, kind: FlowView["kind"], seq: number, label: string): FlowView {
  return { id: `${kind}-${seq}`, from, to, kind, seq, label };
}

/**
 * Fold one event into the state.
 *
 * Returns a new top-level object (so React re-renders) over mutable inner maps (so a run with
 * tens of thousands of events does not spend its life allocating).
 */
export function reduce(prev: CityState, event: CityEvent): CityState {
  const agents = prev.agents as Map<string, AgentView>;
  const tasks = prev.tasks as Map<string, TaskView>;
  const swarms = prev.swarms as Map<string, SwarmView>;
  const genesis = prev.genesis as Map<string, GenesisView>;
  const gates = prev.gates as Map<string, { status: GateStatus; owner: string; detail: string }>;

  const next: CityState = {
    ...prev,
    agents,
    tasks,
    swarms,
    genesis,
    gates,
    log: [...prev.log.slice(-(MAX_LOG - 1)), event],
    lastSeq: event.seq,
    gap: prev.gap || (prev.lastSeq > 0 && event.seq !== prev.lastSeq + 1),
  };

  let flows = prev.flows;
  const pushFlow = (f: FlowView) => {
    flows = [...flows.slice(-(MAX_FLOWS - 1)), f];
  };

  switch (event.kind) {
    case "run.started":
      return { ...next, objective: event.objective, mode: event.mode, finished: false, flows };
    case "run.finished":
      return { ...next, finished: true, flows };

    case "task.created": {
      const t = task(tasks, event.taskId);
      t.title = event.title;
      t.owner = event.owner;
      t.dependsOn = event.dependsOn;
      t.workClass = event.workClass;
      agent(agents, event.owner, event.seq);
      break;
    }
    case "task.assigned": {
      const t = task(tasks, event.taskId);
      t.state = "assigned";
      t.route = event.route;
      t.workers = event.workers;
      // Its dependencies resolved, or it would not have been assigned.
      t.waitingOn = [];
      pushFlow(flow("atlas", event.owner, "assignment", event.seq, event.taskId));
      break;
    }
    case "task.started":
      task(tasks, event.taskId).state = "working";
      break;
    case "task.waiting": {
      const t = task(tasks, event.taskId);
      t.state = "waiting";
      t.waitingOn = event.waitingOn;
      break;
    }
    case "task.blocked": {
      const t = task(tasks, event.taskId);
      t.state = "blocked";
      t.blockedReason = event.reason;
      break;
    }
    case "task.submitted":
      task(tasks, event.taskId).state = "submitted";
      break;
    case "task.repair_requested": {
      const t = task(tasks, event.taskId);
      t.state = "repair";
      t.cycles = event.cycle;
      pushFlow(flow(event.from, event.owner, "repair", event.seq, event.summary));
      break;
    }
    case "task.completed": {
      const t = task(tasks, event.taskId);
      t.state = "complete";
      t.cycles = event.cycles;
      break;
    }
    case "task.failed": {
      const t = task(tasks, event.taskId);
      t.state = "failed";
      t.blockedReason = event.reason;
      break;
    }

    case "agent.state": {
      const a = agent(agents, String(event.agent), event.seq);
      a.activity = event.activity;
      a.detail = event.detail ?? null;
      a.taskId = event.taskId ?? null;
      break;
    }
    case "agent.moved": {
      const a = agent(agents, String(event.agent), event.seq, event.fromDistrict);
      a.travel = { from: event.fromDistrict, to: event.toDistrict, startedSeq: event.seq };
      a.district = event.toDistrict;
      break;
    }
    case "message.sent":
      pushFlow(flow(String(event.from), String(event.to), "message", event.seq, event.subject));
      break;

    case "artifact.produced":
      task(tasks, event.taskId).artifacts.push({ id: event.artifactId, kind: event.artifactKind, summary: event.summary });
      break;

    case "verification.started":
      pushFlow(flow(event.verifier, event.taskId, "verification", event.seq, event.method));
      break;
    case "verification.passed": {
      const t = task(tasks, event.taskId);
      t.verdicts = [...t.verdicts.filter((v) => v.method !== event.method), { verifier: event.verifier, method: event.method, passed: true, summary: "passed" }];
      break;
    }
    case "verification.failed": {
      const t = task(tasks, event.taskId);
      t.verdicts = [...t.verdicts.filter((v) => v.method !== event.method), { verifier: event.verifier, method: event.method, passed: false, summary: event.summary }];
      pushFlow(flow(event.verifier, event.owner, "repair", event.seq, event.summary));
      break;
    }

    case "swarm.spawned":
      swarms.set(event.swarmId, {
        id: event.swarmId,
        lead: event.lead,
        workers: event.workers,
        question: event.question,
        model: event.model,
        reported: 0,
        sources: 0,
        contradictions: [],
        synthesized: false,
        dissolved: false,
      });
      break;
    case "swarm.worker.reported": {
      const s = swarms.get(event.swarmId);
      if (s) {
        s.reported += 1;
        s.sources += event.sources;
      }
      break;
    }
    case "swarm.contradiction":
      swarms.get(event.swarmId)?.contradictions.push(event.claim);
      break;
    case "swarm.synthesized": {
      const s = swarms.get(event.swarmId);
      if (s) s.synthesized = true;
      break;
    }
    case "swarm.dissolved": {
      const s = swarms.get(event.swarmId);
      if (s) s.dissolved = true;
      break;
    }

    case "genesis.genome_created":
      genesis.set(event.genomeId, {
        genomeId: event.genomeId,
        name: event.proposedName,
        stage: "genome",
        bay: null,
        mentor: null,
        trials: [],
        adversarial: [],
        agentId: null,
        rationale: null,
      });
      break;
    case "genesis.necessity": {
      const g = genesis.get(event.genomeId);
      if (g) {
        g.stage = event.verdict === "pass" ? "necessity cleared" : "refused";
        g.rationale = event.rationale;
      }
      break;
    }
    case "genesis.incubated": {
      const g = genesis.get(event.genomeId);
      if (g) {
        g.stage = "incubating";
        g.bay = event.bay;
        g.mentor = event.mentor;
      }
      break;
    }
    case "genesis.trial": {
      const g = genesis.get(event.genomeId);
      if (g) {
        g.stage = "competency trials";
        g.trials.push({ trial: event.trial, score: event.score, threshold: event.threshold, passed: event.passed });
      }
      break;
    }
    case "genesis.adversarial": {
      const g = genesis.get(event.genomeId);
      if (g) {
        g.stage = "adversarial review";
        g.adversarial.push({ reviewer: event.reviewer, passed: event.passed, findings: [...event.findings] });
      }
      break;
    }
    case "genesis.citizenship": {
      const g = genesis.get(event.genomeId);
      if (g) {
        g.stage = "probationary resident";
        g.agentId = event.agentId;
      }
      // The new agent appears on the map here and nowhere else. The door opens because
      // admissions cleared, not because an animation was due.
      const a = agent(agents, event.agentId, event.seq, "genesis-foundry");
      a.detail = `${event.name} · ${event.rank} · mentor ${event.mentor} · ${event.bay}`;
      break;
    }
    case "genesis.disposition": {
      const g = genesis.get(event.agentId);
      if (g) {
        g.stage = event.disposition;
        g.rationale = event.rationale;
      }
      break;
    }

    case "gate.evaluated":
      gates.set(event.gateId, { status: event.status, owner: event.owner, detail: event.detail });
      break;
    case "release.blocked":
      return { ...next, flows, release: { decision: "blocked", outstanding: event.outstanding } };
    case "release.approved":
      return { ...next, flows, release: { decision: "approved", outstanding: [] } };

    case "capability.degraded":
      return { ...next, flows, degradations: [...prev.degradations, { capability: event.capability, consequence: event.consequence }] };
    case "constitution.violated":
      return { ...next, flows, violations: [...prev.violations, { article: event.article, subject: event.subject, detail: event.detail }] };

    default:
      break;
  }

  return { ...next, flows };
}

export function reduceAll(state: CityState, events: readonly CityEvent[]): CityState {
  return events.reduce(reduce, state);
}

/**
 * Seed the founding residents at their home districts.
 *
 * This is not an exception to Article 9 — the roster comes from the server's description of
 * the running organization, the same source the orchestrator routes from. Without it a
 * resident whose work happens where it already lives never emits a movement event, and the
 * city would show it standing at a default address it has never been to. Showing an agent
 * somewhere it is not is precisely the failure the article exists to prevent.
 */
export function seedResidents(
  state: CityState,
  residents: readonly { id: string; district: string }[],
): CityState {
  const agents = state.agents as Map<string, AgentView>;
  for (const r of residents) {
    const existing = agents.get(r.id);
    if (existing) {
      // Only correct an agent that has never been placed by an event.
      if (existing.since === 0) existing.district = r.district;
      continue;
    }
    agents.set(r.id, {
      id: r.id,
      district: r.district,
      activity: "idle",
      detail: null,
      taskId: null,
      resident: true,
      since: 0,
      travel: null,
    });
  }
  return { ...state, agents };
}

/** Operations-view counts, derived from the same task views the city draws. */
export function operations(state: CityState): Record<string, number> {
  const counts = { working: 0, verifying: 0, blocked: 0, waiting: 0, failed: 0, complete: 0 };
  for (const t of state.tasks.values()) {
    if (t.state === "assigned" || t.state === "working") counts.working += 1;
    else if (t.state === "submitted" || t.state === "verifying") counts.verifying += 1;
    else if (t.state === "blocked" || t.state === "repair") counts.blocked += 1;
    else if (t.state === "planned" || t.state === "waiting") counts.waiting += 1;
    else if (t.state === "failed") counts.failed += 1;
    else if (t.state === "complete") counts.complete += 1;
  }
  return counts;
}
