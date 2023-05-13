FROM node:16.16-buster

# Set up code directory
RUN mkdir /code
WORKDIR /code

COPY www/. /code/

RUN yarn install

VOLUME [ "/code/node_modules" ]
VOLUME [ "/code/build" ]

ENTRYPOINT [ "yarn" ]