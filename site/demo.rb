# ruby.wasm の中で japanese_address_parser を動かすための準備をする。
# app.js がこのファイルを一度だけ評価し、以降は入力のたびに Demo.parse を呼ぶ。

require 'js'
require 'json'
require 'fileutils'

# 1. gem のソース（build.rb が作る gems.json）を wasm 内のインメモリ FS に展開して $LOAD_PATH に載せる。
GEMS_DIR = '/gems'

JSON.parse(JS.global.fetch('gems.json').await.text.await.to_s).each do |path, source|
  full_path = File.join(GEMS_DIR, path)
  FileUtils.mkdir_p(File.dirname(full_path))
  File.write(full_path, source)
end
$LOAD_PATH.unshift(GEMS_DIR)

# 2. wasm には socket が無く、net/http も SocketError も存在しない。
#    gem が rescue 節で参照する例外クラスだけを用意して、net/http は読み込み済みとして扱う。
class SocketError < StandardError; end unless defined?(SocketError)

module Net
  class OpenTimeout < StandardError; end
  class ReadTimeout < StandardError; end
end
$LOADED_FEATURES << 'net/http.rb'

require 'japanese_address_parser'

# 3. gem の唯一の I/O 境界である Fetcher.fetch を、ブラウザの fetch に差し替える。
#    元の実装にある geolonia_api_key・User-Agent・file:// とローカルパスの読み込みは、このデモでは扱わない。
module JapaneseAddressParser
  module Fetcher
    def self.fetch(input, offset: nil, length: nil)
      url = "#{JapaneseAddressParser.config.japanese_addresses_api}#{input}"
      options = JS.eval('return {}')
      unless offset.nil? || length.nil?
        headers = JS.eval('return {}')
        headers[:Range] = "bytes=#{offset}-#{offset + length - 1}"
        options[:headers] = headers
      end

      response = JS.global.fetch(url, options).await
      Response.new(body: response.text.await.to_s, ok: response[:ok] == JS::True)
    rescue JS::Error => e
      # gem は SocketError を「データ取得の失敗」（NormalizeError）として扱う。
      raise(SocketError, e.message)
    end
  end
end

module Demo
  # 住所を解析し、Address#to_h（生データの metadata を除く）を JSON 文字列で返す。
  # 引数は JS の文字列（JS::Object）で渡される。
  def self.parse(input)
    address = JapaneseAddressParser.call!(input.to_s)
    JSON.generate(address.to_h.except(:metadata))
  rescue JapaneseAddressParser::NormalizeError => e
    JSON.generate({ error: e.message })
  end
end

JSON.generate({ ruby: RUBY_VERSION, gem: JapaneseAddressParser::VERSION })
