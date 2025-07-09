import { ActionFormData } from '@minecraft/server-ui';
import { dataTypes, idTypes } from './types';
import { EntityComponentTypes, ItemComponentTypes } from '@minecraft/server';

const customContent = {
    /*
    'custom:block': {
         texture: 'minecraft:gold_block',
         type: 'block'
    },
    'custom:item': {
         texture: 'textures/items/paper',
         type: 'item'
    },
    */
};
const customContentKeys = new Set(Object.keys(customContent));
const customItems = Object.values(customContent).filter(value => value.type === 'item').length;
const chestSizes = new Map([['single', ['§c§h§e§s§t§2§7§r', 27]], ['small', ['§c§h§e§s§t§2§7§r', 27]], ['double', ['§c§h§e§s§t§5§4§r', 54]], ['large', ['§c§h§e§s§t§5§4§r', 54]], ['1', ['§c§h§e§s§t§0§1§r', 1]], ['5', ['§c§h§e§s§t§0§5§r', 5]], ['9', ['§c§h§e§s§t§0§9§r', 9]], ['18', ['§c§h§e§s§t§1§8§r', 18]], ['27', ['§c§h§e§s§t§2§7§r', 27]], ['36', ['§c§h§e§s§t§3§6§r', 36]], ['45', ['§c§h§e§s§t§4§5§r', 45]], ['54', ['§c§h§e§s§t§5§4§r', 54]], [1, ['§c§h§e§s§t§0§1§r', 1]], [5, ['§c§h§e§s§t§0§5§r', 5]], [9, ['§c§h§e§s§t§0§9§r', 9]], [18, ['§c§h§e§s§t§1§8§r', 18]], [27, ['§c§h§e§s§t§2§7§r', 27]], [36, ['§c§h§e§s§t§3§6§r', 36]], [45, ['§c§h§e§s§t§4§5§r', 45]], [54, ['§c§h§e§s§t§5§4§r', 54]]]);

export class ChestFormData {
    #buttonArray; #titleText; slotCount;

    constructor(size = 'single') {
        const [title, count] = chestSizes.get(size) ?? ['§c§h§e§s§t§2§7§r', 27];

        this.#buttonArray = Array(count).fill(['', undefined]);
        this.#titleText = [{ text: title }];
        this.slotCount = count;
    }

    title(text) {
        if (typeof text === 'string') this.#titleText.push({ text });
        else if (text && typeof text === 'object' && Array.isArray(text.rawtext)) this.#titleText.push(...text.rawtext);

        return this;
    }

    button(slot, name = '', description = [], texture, stack = 1, durability = 0, enchanted = false) {
        const resolvedTexture = customContentKeys.has(texture) ? customContent[texture]?.texture : texture;
        const auxId = resolvedTexture ? dataTypes.get(resolvedTexture) ?? idTypes.get(resolvedTexture) : undefined;
        const label = [{ text: `stack#${String(stack).padStart(2, '0')}dur#${String(durability).padStart(2, '0')}` }, { text: name + '§r' }];

        for (const line of description ?? []) label.push({ text: '\n' + line });

        const index = Math.max(0, Math.min(slot, this.slotCount - 1));
        const iconId = auxId === undefined ? resolvedTexture : (auxId + (auxId < 256 ? 0 : customItems)) * 65536 + (enchanted ? 32768 : 0);

        this.#buttonArray[index] = [{ rawtext: label }, iconId?.toString()];

        return this;
    }
    async show(player) {
        const form = new ActionFormData().title({ rawtext: this.#titleText });

        this.#buttonArray.forEach(([text, iconPath]) => form.button(text, iconPath));

        const container = player.getComponent(EntityComponentTypes.Inventory)?.container;

        if (!container) return form.show(player);

        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);

            if (!item) {
                form.button('', undefined);

                continue;
            }

            const itemId = item.typeId;
            const itemTexture = customContentKeys.has(itemId) ? customContent[itemId]?.texture : itemId;
            const auxId = dataTypes.get(itemTexture) ?? idTypes.get(itemTexture);
            const durability = item.getComponent(ItemComponentTypes.Durability);
            const durabilityDamage = durability && durability.damage > 0 ? Math.round(((durability.maxDurability - durability.damage) / durability.maxDurability) * 99) : 0;
            const itemCount = item.amount;
            const itemName = item.nameTag?.trim() || itemId.replace(/.*:/, '').replace(/_/g, ' ').replace(/(^\w|\s\w)/g, characterToCapitalize => characterToCapitalize.toUpperCase());
            const enchantable = item.getComponent(ItemComponentTypes.Enchantable);
            const isEnchanted = enchantable && enchantable?.getEnchantments()?.length > 0;
            const enchantedItem = isEnchanted ? `§b${itemName}` : itemName;
            const label = [{ text: `stack#${String(itemCount).padStart(2, '0')}dur#${String(durabilityDamage).padStart(2, '0')}§r${enchantedItem}` }];
            const lore = item.getLore();

            for (const line of lore) label.push({ text: '\n' + line });

            if (isEnchanted) {
                for (const enchant of enchantable?.getEnchantments()) {
                    if (!enchant?.type?.id || enchant.level <= 0) continue;

                    const enchantId = enchant.type.id.replace('minecraft:', '').replace(/_/g, ' ');
                    const enchantName = enchantId.replace(/(^\w|\s\w)/g, characterToCapitalize => characterToCapitalize.toUpperCase());

                    label.push({ text: `\n§7${enchantName} ${toRoman(enchant.level)}` });
                }
            }

            const iconPath = auxId === undefined ? itemTexture : (auxId + (auxId < 256 ? 0 : customItems)) * 65536 + (isEnchanted ? 32768 : 0);

            form.button({ rawtext: label }, iconPath?.toString());
        }

        return form.show(player);
    }
}

function toRoman(value) {
    if (typeof value !== 'number' || value <= 0) return '';

    const romans = [['M', 1000], ['CM', 900], ['D', 500], ['CD', 400], ['C', 100], ['XC', 90], ['L', 50], ['XL', 40], ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]];

    return romans.reduce((romanNumeral, [symbol, symbolValue]) => {
        while (value >= symbolValue) {
            romanNumeral += symbol;
            value -= symbolValue;
        }

        return romanNumeral;
    }, '');
}
