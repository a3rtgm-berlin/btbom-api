module.exports = class MultiBom {
    constructor(boms) {
        this.bom = boms[0];
        this.bom.id = boms[0].id.substring(0, boms[0].id.indexOf('-') + 8) + '-M';

        for (let i = 1; i < boms.length; i++) {
            this.mergeIntoMultiBom(boms[i]);
        }
    }

    mergeIntoMultiBom(bom) {
        this.bom.json.forEach((part) => {
            bom.json.forEach(_part => {
                if (_part.Location === part.Location && _part.Part == part.Part) {
                    part['Quantity Total'] = part['Quantity Total'] >= _part['Quantity Total'] ? part['Quantity Total'] : _part['Quantity Total'];
                    _part.delete = true;
                }
            });
        });
        const newItems = bom.json.filter(part => !part.delete);
        this.bom.json = [...this.bom.json, ...newItems];

        bom.remove();
    }
}