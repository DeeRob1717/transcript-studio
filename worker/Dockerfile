FROM ghcr.io/ggml-org/whisper.cpp:main

ARG WHISPER_MODEL_URL=https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin?download=true

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./
RUN mkdir -p /app/models \
  && curl -L "$WHISPER_MODEL_URL" -o /app/models/ggml-base.bin

ENV PORT=8080
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV WHISPER_CPP_EXE=whisper-cli

EXPOSE 8080

ENTRYPOINT []
CMD ["node", "server.js"]
