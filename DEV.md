## Steps for local setup & run moxie-agent-skills

1. Need node Node.js 23+
2. pnpm 9+
3. set node version
    ```bash
    pnpm env use --global 23.3.0
    ```
4. git clone git@github.com:moxie-protocol/moxie-agent-skills.git
5. cd moxie-agent-skills
6. Create a new branch from `main`
    ```sh
    git checkout -b <new-branch>
    ```
7. `pnpm install --no-frozen-lockfile`
8. `cd ./packages/moxie-agent-lib && pnpm run build && cd ../../ && pnpm build`
9. Setup .env file. By default, the Moxie Character uses OpenAI model thus need OpenAI API key
10. Run agent `pnpm start`
11. Run client `pnpm start:client`

Once the client is running, you'll see a message like this:

```
➜  Local:   http://localhost:5173/
```

## Stpes to run the registry

1. `pnpm install --no-frozen-lockfile`
2. `cd ./packages/moxie-agent-lib && pnpm run build && cd ../../ && pnpm build`
3. `pnpm start:registry`

## Troubleshoot

1. If getting error related to sharp package `/node_modules/sharp` then set Env var
    ```
    export SHARP_IGNORE_GLOBAL_LIBVIPS=1
    ```
2. If getting SQLITE error on embedding vector size differet, then simply delete the local sqlite under `agent/data/db.sqlite` and re-run the agent again
