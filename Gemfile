source "https://rubygems.org"
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

ruby "3.1.0"

gem "rails", github: "rails/rails", branch: "main"
gem "propshaft"
gem "puma", "~> 5.0"
gem "tailwindcss-rails"
gem "tzinfo-data", platforms: %i[ mingw mswin x64_mingw jruby ]
gem "japanese_address_parser"

group :development, :test do
  gem "debug", platforms: %i[ mri mingw x64_mingw ]
end
