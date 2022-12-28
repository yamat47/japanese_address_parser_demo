RSpec.describe 'Roots#show page' do
  specify do
    visit '/'

    expect(page).to have_css('h1', text: 'JapaneseAddressParser')
  end
end
