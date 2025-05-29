### Ownership - Rules - Borrow Immutable
1. There is no limit on the number of borrowers. 
2. Immutable borrowers prevents any mutable borrows.
### Ownership - Rules - Borrow Mutable
1. One and only one mutable borrower at a time. 
2. Mutable borrow is not allowed while there are immutable borrowers.