package feri.um.si.omreznina.model;

import lombok.Data;

@Data
public class MfaSettings {
    private String uid;
    private boolean enabled;
    private String secretHash;

    public MfaSettings() {
    }

    public MfaSettings(String uid, boolean enabled, String secretHash) {
        this.uid = uid;
        this.enabled = enabled;
        this.secretHash = secretHash;
    }
}
