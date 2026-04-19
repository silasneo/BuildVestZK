fn main(balances: [Field; 3], threshold: Field) -> pub Field {
    for balance_index in 0..3 {
        assert((balances[balance_index] as u64) >= (threshold as u64));
    }
    threshold
}