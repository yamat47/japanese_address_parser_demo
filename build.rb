# frozen_string_literal: true

# Collects the Ruby sources of japanese_address_parser and its runtime
# dependencies into site/gems.json ({ "path/under/lib.rb" => source }).
# The page writes them into the in-memory file system of ruby.wasm at boot.

require 'bundler/setup'
require 'json'

ROOT_GEM = 'japanese_address_parser'
OUTPUT_PATH = File.expand_path('site/gems.json', __dir__)

# The gem and every runtime dependency, so that a dependency added by a new
# release is embedded without touching this file.
def runtime_specs(name, specs = {})
  return specs if specs.key?(name)

  spec = Gem.loaded_specs.fetch(name)
  specs[name] = spec
  spec.runtime_dependencies.each { |dependency| runtime_specs(dependency.name, specs) }
  specs
end

files = {}
specs = runtime_specs(ROOT_GEM).values

specs.each do |spec|
  spec.require_paths.each do |require_path|
    base = File.join(spec.full_gem_path, require_path)
    Dir.glob('**/*.rb', base:).each do |path|
      files[path] = File.read(File.join(base, path), encoding: 'UTF-8')
    end
  end
end

File.write(OUTPUT_PATH, JSON.generate(files))

puts "#{OUTPUT_PATH}: #{files.size} files, #{File.size(OUTPUT_PATH)} bytes"
specs.each { |spec| puts "  #{spec.name} #{spec.version}" }
