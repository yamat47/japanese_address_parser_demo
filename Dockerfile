# Development image: Ruby with the gems from the Gemfile.
# The repository is mounted at /app by compose.yaml, so gems live outside of it.
FROM ruby:4.0.7-slim

WORKDIR /app

COPY Gemfile Gemfile.lock ./
RUN bundle install
