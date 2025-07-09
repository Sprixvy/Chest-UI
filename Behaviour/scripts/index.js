import { world } from '@minecraft/server';
import { ChestFormData } from './chest_form/main';

world.afterEvents.buttonPush.subscribe(data => {
    const source = data.source;
    const form = new ChestFormData('27');

    form.title('Chest UI');
    form.button(12, '§bDiamond Sword', ['§7Unbreaking X'], 'minecraft:diamond_sword', 1, 50, true);
    form.button(14, 'Apple', [], 'textures/items/apple', 1, 0, true);
    form.show(source).then(() => { });
});
