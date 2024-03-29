# frozen_string_literal: true

RSpec.describe 'Roots#show page' do
  specify 'TokyoTower\'s address is parsable.' do
    visit '/'

    expect(page).to have_css('h1', text: 'JapaneseAddressParser')

    fill_in 'search',	with: '東京都港区芝公園４丁目２−８'
    click_on '解析'

    expect(page).to have_text '解析結果'
    expect(page.find_by_id('prefecture')).to have_text 'TOKYO TO'
    expect(page.find_by_id('city')).to have_text 'MINATO KU'
    expect(page.find_by_id('town')).to have_text 'SHIBAKOEN 4'
  end

  specify 'Lumen Field\'s address is not parsable.' do
    visit '/'

    expect(page).to have_css('h1', text: 'JapaneseAddressParser')

    fill_in 'search',	with: '800 Occidental Ave. S. Seattle, WA 98134'
    click_on '解析'

    expect(page).to have_text '解析結果'
    expect(page.find_by_id('prefecture')).to have_text '見つかりませんでした。'
    expect(page.find_by_id('city')).to have_text '見つかりませんでした。'
    expect(page.find_by_id('town')).to have_text '見つかりませんでした。'
  end
end
