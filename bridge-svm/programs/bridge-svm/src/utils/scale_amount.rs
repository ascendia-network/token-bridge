

// can safely use u128 when (to_decimals - from_decimals) <= 19
// todo add decimals assertion on token initialization?
pub fn scale_amount(num: u64, from_decimals: u8, to_decimals: u8) -> [u8; 32] {
    let factor = 10u128.pow((to_decimals as i32 - from_decimals as i32).abs() as u32);
    let mut lo = num as u128;

    if to_decimals > from_decimals {
        // Scale up
        let (new_lo, carry) = lo.overflowing_mul(factor);
        assert!(!carry);
        lo = new_lo;
    } else {
        lo /= factor
    }

    let mut bytes = [0u8; 32];
    let lo_bytes = lo.to_be_bytes();
    bytes[32 - lo_bytes.len()..].copy_from_slice(&lo_bytes);
    bytes
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scale_up() {
        let num = 1488_000_000;
        let from_decimals = 6;
        let to_decimals = 18;
        let result = scale_amount(num, from_decimals, to_decimals);
        let expected: [u8; 32] = [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 80, 170, 37, 244,
            60, 245, 64, 0, 0,
        ];
        assert_eq!(result, expected);
    }

    #[test]
    fn test_scale_down() {
        let num = 1_000_000_000_000;
        let from_decimals = 6;
        let to_decimals = 1;
        let result = scale_amount(num, from_decimals, to_decimals);
        let expected: [u8; 32] = [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            152, 150, 128,
        ];
        assert_eq!(result, expected);
    }

    #[test]
    fn test_no_scale() {
        let num = 1_000_000;
        let from_decimals = 6;
        let to_decimals = 6;
        let result = scale_amount(num, from_decimals, to_decimals);
        let expected: [u8; 32] = [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            15, 66, 64,
        ];
        assert_eq!(result, expected);
    }
}
