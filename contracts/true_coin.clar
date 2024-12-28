;; TrueCoin - A stablecoin for cross-border commerce
(impl-trait .sip-010-trait.sip-010-trait)

;; Token Definition
(define-fungible-token true-coin)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-insufficient-funds (err u101))
(define-constant err-insufficient-collateral (err u102))
(define-constant err-invalid-price (err u103))
(define-constant minimum-collateral-ratio u150) ;; 150%

;; Data Variables
(define-data-var token-uri (string-utf8 256) "")
(define-data-var oracle-address principal contract-owner)
(define-data-var collateral-price uint u100000000) ;; 8 decimal places
(define-data-var total-collateral uint u0)

;; Collateral Map
(define-map user-collateral principal uint)

;; SIP-010 Functions
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (match (ft-transfer? true-coin amount sender recipient)
        success (ok success)
        error (err error)))

(define-read-only (get-name)
    (ok "TrueCoin"))

(define-read-only (get-symbol)
    (ok "TRUE"))

(define-read-only (get-decimals)
    (ok u8))

(define-read-only (get-balance (who principal))
    (ok (ft-get-balance true-coin who)))

(define-read-only (get-total-supply)
    (ok (ft-get-supply true-coin)))

(define-read-only (get-token-uri)
    (ok (var-get token-uri)))

;; Collateral Management Functions
(define-public (deposit-collateral)
    (let ((amount (stx-get-balance tx-sender)))
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
        (map-set user-collateral tx-sender 
            (+ (default-to u0 (map-get? user-collateral tx-sender)) amount))
        (var-set total-collateral (+ (var-get total-collateral) amount))
        (ok amount)))

(define-public (mint (amount uint))
    (let (
        (user-coll (default-to u0 (map-get? user-collateral tx-sender)))
        (collateral-value (* user-coll (var-get collateral-price)))
        (required-collateral (* amount minimum-collateral-ratio))
    )
    (asserts! (>= collateral-value required-collateral) err-insufficient-collateral)
    (ft-mint? true-coin amount tx-sender)))

(define-public (burn (amount uint))
    (begin
        (try! (ft-burn? true-coin amount tx-sender))
        (let ((collateral-to-return (/ (* amount (var-get collateral-price)) u100000000)))
            (try! (as-contract (stx-transfer? collateral-to-return (as-contract tx-sender) tx-sender)))
            (map-set user-collateral tx-sender 
                (- (default-to u0 (map-get? user-collateral tx-sender)) collateral-to-return))
            (var-set total-collateral (- (var-get total-collateral) collateral-to-return))
            (ok collateral-to-return))))

;; Oracle Functions
(define-public (update-price (new-price uint))
    (begin
        (asserts! (is-eq tx-sender (var-get oracle-address)) err-owner-only)
        (var-set collateral-price new-price)
        (ok true)))

;; Admin Functions
(define-public (set-oracle (new-oracle principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set oracle-address new-oracle)
        (ok true)))