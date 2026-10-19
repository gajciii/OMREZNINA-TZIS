package feri.um.si.omreznina.model;

import feri.um.si.omreznina.type.TariffType;
import lombok.Data;

@Data
public class Tariff {
    private TariffType type;
    private double price;

    public Tariff() {
    }

    public Tariff(TariffType type, double price) {
        this.type = type;
        this.price = price;
    }

    public Tariff(TariffType type) {
        this.type = type;
        this.price = setPrice(type);
    }

    private double setPrice(TariffType type) {
        if (type == TariffType.MT) {
            return 0.09790;
        } else if (type == TariffType.VT) {
            return 0.11990;
        } else {
            return 0.10890;
        }
    }
}
