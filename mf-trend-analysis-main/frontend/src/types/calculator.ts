export interface SIPYear {
    year:number
    monthly_investment:number
    total_invested_so_far:number
    corpus_value:number
}

export interface SIPProjectionResponse{

total_invested:number

estimated_returns:number

maturity_value:number

inflation_adjusted_value:number|null

yearly_breakdown:SIPYear[]

}

export interface LumpsumYear{

year:number

value:number

}

export interface LumpsumProjectionResponse{

principal:number

estimated_returns:number

maturity_value:number

inflation_adjusted_value:number|null

yearly_breakdown:LumpsumYear[]

}
