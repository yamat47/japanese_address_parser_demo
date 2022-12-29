# frozen_string_literal: true

RSpec.describe 'Roots#show page' do
  specify 'TokyoTower\'s address is parsable.' do
    visit '/'

    expect(page).to have_css('h1', text: 'JapaneseAddressParser')

    fill_in 'search',	with: '東京都港区芝公園４丁目２−８'
    click_button '解析'

    expect(page).to have_text '解析結果'
    expect(page).to have_text 'TOKYO TO'
    expect(page).to have_text 'MINATO KU'
    expect(page).to have_text 'SHIBAKOEN 4'
  end
end
