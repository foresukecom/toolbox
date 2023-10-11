FROM ubuntu:latest

# Install necessary packages
RUN apt-get update && apt-get install -y curl git vim zsh sudo locales tree

# Set locale to Japanese
RUN locale-gen ja_JP.UTF-8
ENV LANG ja_JP.UTF-8
ENV LANGUAGE ja_JP:ja
ENV LC_ALL ja_JP.UTF-8

# Install nodejs
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -  # 18.x を目的のバージョンに
RUN apt-get install -y nodejs
RUN npm install -g @vue/cli yarn webpack babel-cli

# Install Go
RUN apt-get install -y golang-go

# Set working directory
WORKDIR /workspace

# Set default command
CMD [ "/bin/zsh" ]
