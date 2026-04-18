fn main(balances: [Field; 3], pub threshold: Field) {
    for i in 0..3 {
        assert((balances[i] as u64) >= (threshold as u64));
    }
}
