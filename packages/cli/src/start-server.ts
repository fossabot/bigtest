import { spawn } from 'effection';
import { Mailbox, readyResource } from '@bigtest/effection';
import { ProjectOptions } from '@bigtest/project';
import { createOrchestratorAtom, createOrchestrator } from '@bigtest/server';

// TODO: this is what the server package should be doing in the first place
// See: https://github.com/thefrontside/bigtest/issues/295
export function* startServer(project: ProjectOptions) {
  return yield readyResource({}, function*(ready) {
    let delegate = new Mailbox();
    let atom = createOrchestratorAtom({ app: project.app });
    yield spawn(createOrchestrator({ atom, delegate, project }));

    yield delegate.receive({ status: 'ready' });
    ready();
    yield;
  });
}
