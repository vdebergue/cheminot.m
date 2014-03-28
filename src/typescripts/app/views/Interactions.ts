export = Interactions;

class Interactions {

    interactions: Array<Q.Promise<void>>;

    constructor() {
        this.interactions = [];
    }

    register(interaction: Q.Promise<void>) {
        var index = this.interactions.length;
        this.interactions.push(interaction);
        interaction.fin(() => {
            delete this.interactions[index];
        });
    }

    await() {
        return Q.all(this.interactions.filter((f) => {
            return Q.isPending(f);
        }));
    }
}