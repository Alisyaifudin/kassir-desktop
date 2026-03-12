## Plan: Direct Receipt Printing (ESC/POS)

Set up a native Rust integration in Tauri to communicate directly with thermal receipt printers, bypassing the browser's print dialog entirely for silent, instant printing.

**Steps**

**Phase 1: Rust Backend Integration (Tauri Commands)**

1. Add dependencies (`escpos-rs` or relevant USB/System printer crates) to `src-tauri/Cargo.toml`.
2. Create a new Rust module (`src-tauri/src/api/printer.rs`) to handle printer logic.
3. Implement `get_printers` command: Queries the OS for a list of available printers and returns them to the frontend.
4. Implement `print_receipt` command: Takes raw receipt data (items, total, tax, business name, etc.) and a target printer name, formats it into ESC/POS bytes, and sends it directly to the printer.
5. Register the new commands in the main Tauri builder (`src-tauri/src/main.rs` or `lib.rs`).

**Phase 2: Frontend API & Store** 6. Create `src/lib/printer-effect.ts` to wrap the Tauri `invoke` calls for `get_printers` and `print_receipt`. 7. Add a new configuration key to the app's settings (likely in `src/database/` or your state store) to save the `default_printer` name and `receipt_width` (e.g., 58mm or 80mm).

**Phase 3: Settings UI** 8. Update your Settings page (e.g., `src/pages/Setting/`) to include a dropdown that calls `get_printers` and lets the user select their default thermal printer. 9. Add a "Test Print" button in Settings to verify communication with the selected printer.

**Phase 4: Checkout/Cashier UI** 10. Update the checkout success flow (likely in `src/pages/Shop/` or `src/transaction/`) to automatically trigger the `print_receipt` command upon a successful transaction, or attach it to a manual "Print" button.

**Relevant files**

- `src-tauri/Cargo.toml` — add printing dependencies
- `src-tauri/src/api/printer.rs` (new) — implement printer discovery and ESC/POS transmission
- `src-tauri/src/main.rs` — register printer commands
- `src/lib/printer-effect.ts` (new) — frontend wrappers for Tauri commands
- `src/pages/Setting/` — add printer selection UI
- `src/pages/Shop/` — integrate the print trigger into the checkout flow

**Verification**

1. Run the app and navigate to Settings. Verify that local system printers are listed in the dropdown.
2. Select a printer and click "Test Print". Verify that a small ESC/POS formatted test slip is printed.
3. Complete a transaction in the Shop view and verify that a formatted receipt is printed silently without opening a browser print dialog.

**Decisions**

- The ESC/POS formatting will be done in the Rust backend to keep the frontend payload light (sending just JSON data, not raw bytes).
- System-installed printers will be targeted first, ignoring raw network (TCP) printers unless specified otherwise.
