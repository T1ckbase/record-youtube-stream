FROM denoland/deno:latest

EXPOSE 7860

WORKDIR /app

RUN chmod -R 777 /app

RUN mkdir -p /.cache
RUN chmod -R 777 /.cache

# Prefer not to run as root.
# USER deno

RUN deno install --entrypoint main.ts

COPY . .

# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno cache main.ts

CMD ["run", "-A", "main.ts"]