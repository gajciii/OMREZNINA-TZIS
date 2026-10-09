package feri.um.si.omreznina.service;

import java.io.IOException;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import feri.um.si.omreznina.helper.MultipartInputStreamFileResource;

@Service
public class FileService {

	@Autowired
	private final RestTemplate restTemplate;

	@Value("${helpers.parser.base-url:http://127.0.0.1:8001}")
	private String parserBaseUrl = "http://127.0.0.1:8001";

	@Value("${helpers.power.base-url:http://127.0.0.1:8002}")
	private String powerBaseUrl = "http://127.0.0.1:8002";

	public FileService(RestTemplate restTemplate) {
		this.restTemplate = restTemplate;
	}

	public String sendFileToParser(MultipartFile file) throws IOException {
		String url = parserBaseUrl + "/upload-file";

		return upoladFile(file, null, url);
	}

	public String uploadMaxPowerConsumed(MultipartFile file, String powerByMonths)
			throws IOException {
		String url = powerBaseUrl + "/upload-file-dogovorjena-moc";

		return upoladFile(file, powerByMonths, url);
	}

	public String calculateOptimalConsumtion(MultipartFile file, String powerByMonths) throws IOException {
		String url = powerBaseUrl + "/optimal";

		return upoladFile(file, powerByMonths, url);
	}

	private String upoladFile(MultipartFile file, String powerByMonths, String url)
			throws IOException {

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.MULTIPART_FORM_DATA);

		MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
		body.add("file", new MultipartInputStreamFileResource(file.getInputStream(), file.getOriginalFilename()));

		if (powerByMonths != null) {
			body.add("power_by_months", powerByMonths);
		}

		HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

		return restTemplate.postForObject(url, requestEntity, String.class);
	}
}
