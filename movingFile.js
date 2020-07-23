module.exports = class MovingFile {
    constructor(Target, Source) {
        this.quantity = 'Quantity Total';
        this.comparators = [
            'Location',
            'Part',
        ];

        // const sortedLists = boms.sort((a, b) => {
        //     var dateA = a.date.split('.');
        //     var dateB = b.date.split('.');
        //     var diff = new Date(dateA[2], dateA[1] - 1, dateA[0]) - new Date(dateB[2], dateB[1] - 1, dateB[0]);
        //     return diff !== 0 ? diff : a.uploadDate - b.uploadDate;
        // });

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

        this.currentBom.json.forEach((currentItem) => {
            // let $ancestors = this.lastBom.json;
            const ancestor = this.lastBom.json.find(oldItem => oldItem['Location Index'] === currentItem['Location Index']);

            if (ancestor) {
                const diff = currentItem[this.quantity] - ancestor[this.quantity];
                currentItem.Change = diff;

                if (diff !== 0) {
                    movingMeta.modified += 1;
                    currentItem.Status = 'remain';
                }
                else {
                    movingMeta.remain += 1;
                    currentItem.Status = 'remain';
                }
            }
            else {
                $added.add(currentItem);
            }
        });

        this.lastBom.json.forEach(oldItem => {
            const successor = this.currentBom.json.find(currentItem => oldItem['Location Index'] === currentItem['Location Index']);

            if (!successor) {
                $removed.add(oldItem);
            }
            else {
                oldItem.Change = successor[this.quantity] - oldItem[this.quantity];
            }
        });

        console.log('half time', this.currentBom.json.length, $added.size, $removed.size);

        $added.forEach((e, currentItem, s) => {
            const $ancestor = Array.from($removed).find(oldItem => oldItem.Part == currentItem.Part);

            if ($ancestor) {
                $added.delete(currentItem);
                $removed.delete($ancestor);

                $ancestor.Status = "movedTo";
                $ancestor.Moved = currentItem.Location;
                this.currentBom.json.push($ancestor);

                currentItem.Status = "movedFrom";
                currentItem.Moved = $ancestor.Location;

                movingMeta.Moved += 1;
            } else {
                currentItem.Status = 'added';
                movingMeta.added += 1;
            }
        });

        console.log($added.size, $removed.size);

        $removed.forEach((e, oldItem, s) => {
            oldItem.Status = "removed";
            movingMeta.removed += 1;
            this.currentBom.json.push(oldItem);
        });

        this.currentBom.json.forEach(item => {
            if (item.Status === "removed") {
                if (!this.currentBom.json.find(currentItem => 
                    currentItem.Part == item.Part && 
                    currentItem.Location !== item.Location && 
                    currentItem.Status !== "removed")) {
                        item.Status = "obsolete";
                        movingMeta.removed -= 1;
                        movingMeta.obsolete += 1;
                    }
            }
        });

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
