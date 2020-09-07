module.exports = class MovingFile {
    constructor(Target, Source) {
        this.quantity = 'Quantity Total';
        this.comparators = [
            'Location',
            'Part',
        ];

        console.log('creating POG', Source.id, Target.id);

        console.log(Source.json.length, Target.json.length);
        console.log(Source.json[12], Target.json[12]);
        
        this.lastBom = {
            id: Source.id,
            json: JSON.parse(JSON.stringify(Source.json))
        };
        this.currentBom = {
            id: Target.id,
            json: JSON.parse(JSON.stringify(Target.json))
        };

        this.setMeta();
    }

    compareLists() {
        const $added = new Set();
        const $removed = new Set();
        const movingMeta = {
            added: 0,
            removed: 0,
            modified: 0,
            remain: 0,
            moved: 0,
            obsolete: 0,
        };

        // check if parts existed on any location before
        this.currentBom.json.forEach((currentItem) => {
            const ancestor = this.lastBom.json.find(oldItem => oldItem['Location Index'] === currentItem['Location Index']);

            // compare quantities if part existed on location before
            if (ancestor) {
                const diff = currentItem[this.quantity] - ancestor[this.quantity];
                currentItem.Change = diff;

                if (diff !== 0) {
                    movingMeta.modified += 1;
                }
                else {
                    movingMeta.remain += 1;
                }

                currentItem.Status = 'remain';
            }

            // add to newly added parts list
            else {
                $added.add(currentItem);
            }
        });

        // check if old parts still exist on their location
        this.lastBom.json.forEach(oldItem => {
            const successor = this.currentBom.json.find(currentItem => oldItem['Location Index'] === currentItem['Location Index']);

            // compare quanities if true
            if (successor) {
                oldItem.Change = oldItem[this.quantity] - successor[this.quantity];
            }

            // add to removed parts list if not
            else {
                $removed.add(oldItem);
            }
        });

        console.log('half time', this.currentBom.json.length, $added.size, $removed.size);

       
        // check for all added parts if they are new or can be moved from another station
        $added.forEach((e, currentItem, s) => {
            //const $ancestor = Array.from($removed).find(oldItem => oldItem.Part == currentItem.Part);

             /*REMOVE MOVEDs*/
             currentItem.Status = 'added';
             
            // assign moving directives if true
            /*if ($ancestor) {
                $added.delete(currentItem);
                $removed.delete($ancestor);

                $ancestor.Status = "movedTo";
                $ancestor.Moved = currentItem.Location;
                this.currentBom.json.push($ancestor);

                currentItem.Status = "movedFrom";
                currentItem.Moved = $ancestor.Location;

                movingMeta.Moved += 1;

            // set to "added" status if not
            } else {
                currentItem.Status = 'added';
                movingMeta.added += 1;
            }*/
        });

        console.log($added.size, $removed.size);

        // check for occurences of a removed Part in currentBom
        $removed.forEach((e, oldItem) => {
            // set obsolete if none
            if (!this.currentBom.json.find(currentItem => currentItem.Part == oldItem.Part)) {
                oldItem.Status = "obsolete";
                movingMeta.obsolete += 1;

                // remove all other occurences of the item from the removed list
                $removed.forEach((k, removedItem) => {
                    if (removedItem.Part == oldItem.Part) {
                        $removed.delete(removedItem);
                    }
                });

            // set removed status if item somewhere on currentBom
            } else {
                oldItem.Status = "redistributed";
                movingMeta.removed += 1;
            }

            // push removed and obsoletes to currentBom
            this.currentBom.json.push(oldItem);
        });

        // this.currentBom.json.forEach(item => {
        //     if (item.Status === "removed") {
        //         if (!this.currentBom.json.find(currentItem => 
        //             currentItem.Part == item.Part && 
        //             currentItem.Location !== item.Location && 
        //             currentItem.Status !== "removed")) {
        //                 item.Status = "obsolete";
        //                 movingMeta.removed -= 1;
        //                 movingMeta.obsolete += 1;
        //             }
        //     }
        // });

        console.log(this.currentBom.json.length);

        return movingMeta;
    }

    setMeta() {
        this.meta = {};
        this.meta.current = this.currentBom.id;
        this.meta.last = this.lastBom.id;
        this.meta.changes = this.compareLists();
    }
};
