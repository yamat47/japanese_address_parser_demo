class RootsController < ApplicationController
  def show
    @search = search_params[:search]
    @address = @search.present? && JapaneseAddressParser.call(@search)
  end

  private

  def search_params
    params.permit(:search)
  end
end
