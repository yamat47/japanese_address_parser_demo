# frozen_string_literal: true

source 'https://rubygems.org'
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

ruby '3.1.3'

gem 'japanese_address_parser'
gem 'pg'
gem 'propshaft'
gem 'puma', '~> 5.6'
gem 'rails'
gem 'tailwindcss-rails'
gem 'tzinfo-data', platforms: %i[mingw mswin x64_mingw jruby]

group :development, :test do
  gem 'brakeman', require: false
  gem 'debug', platforms: %i[mri mingw x64_mingw]
  gem 'rubocop', require: false
  gem 'rubocop-rails', require: false
  gem 'rspec-rails'
  gem 'capybara'
  gem 'selenium-webdriver'
end
