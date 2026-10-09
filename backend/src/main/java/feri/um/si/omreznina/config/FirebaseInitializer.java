package feri.um.si.omreznina.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.AccessToken;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.io.IOException;

@Configuration
@Profile("!test")
public class FirebaseInitializer {
    @Bean(destroyMethod = "delete")
    public FirebaseApp firebaseApp(
            @Value("${firebase.mode:emulator}") String mode,
            @Value("${firebase.project-id:demo-omreznina}") String projectId,
            @Value("${firebase.firestore-emulator-host:127.0.0.1:8081}") String firestoreHost) throws IOException {
        FirebaseOptions.Builder options = FirebaseOptions.builder().setProjectId(projectId);
        if ("emulator".equalsIgnoreCase(mode)) {
            String authHost = System.getenv("FIREBASE_AUTH_EMULATOR_HOST");
            if (authHost == null || authHost.isBlank()) {
                throw new IllegalStateException(
                        "Local Firebase requires FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099. Use the local launcher.");
            }
            GoogleCredentials credentials = GoogleCredentials.create(new AccessToken("owner", null));
            options.setCredentials(credentials)
                    .setFirestoreOptions(FirestoreOptions.newBuilder()
                            .setProjectId(projectId)
                            .setCredentials(credentials)
                            .setEmulatorHost(firestoreHost)
                            .build());
        } else if ("cloud".equalsIgnoreCase(mode)) {
            if (System.getenv("FIREBASE_AUTH_EMULATOR_HOST") != null
                    || System.getenv("FIRESTORE_EMULATOR_HOST") != null) {
                throw new IllegalStateException("Unset Firebase emulator variables before selecting cloud mode.");
            }
            options.setCredentials(GoogleCredentials.getApplicationDefault());
        } else {
            throw new IllegalArgumentException("firebase.mode must be emulator or cloud.");
        }
        return FirebaseApp.initializeApp(options.build());
    }

    @Bean
    public Firestore firestore(FirebaseApp firebaseApp) {
        return com.google.firebase.cloud.FirestoreClient.getFirestore(firebaseApp);
    }

}
