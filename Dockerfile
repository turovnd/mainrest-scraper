FROM node:latest

RUN apt-get update &&\
    apt-get install -y libgtk2.0-0 libgconf-2-4 \
    libnotify4 libasound2 libxtst6 libxss1 libnss3 xvfb

RUN mkdir /var/agent
RUN mkdir /var/plugins

WORKDIR /var/agent

COPY modules modules
COPY index.js index.js
COPY package.json package.json
COPY .env .env
COPY .gitignore .gitignore

RUN npm install

ENTRYPOINT xvfb-run --server-args="-screen 9 1280x2000x24" node index.js

# Help
# docker build -t agent .
# docker run --name Agent_1 -v ~/plugins/:/var/plugins -d -it agent

# Stop/delete all containers
# docker stop $(docker ps -a -q)
# docker rm $(docker ps -a -q)