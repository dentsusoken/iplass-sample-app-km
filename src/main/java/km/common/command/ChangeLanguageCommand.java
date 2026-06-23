/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.command;

import java.util.Set;
import km.common.auth.AuthHelper;
import km.common.dao.EntityDaoHelper;
import km.common.util.CommandResponseUtil;
import org.iplass.mtp.auth.AuthContext;
import org.iplass.mtp.auth.User;
import org.iplass.mtp.command.Command;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.command.annotation.CommandClass;
import org.iplass.mtp.command.annotation.webapi.RestJson;
import org.iplass.mtp.command.annotation.webapi.WebApi;
import org.iplass.mtp.command.annotation.webapi.WebApiResultAttribute;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.UpdateOption;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;

/**
 * ログインユーザーの表示言語を切り替え、選択をユーザー設定として永続化する。
 *
 * <p>WebAPI: POST /api/km/user/language/change</p>
 * <p>Request body: { "language": "ja" }</p>
 *
 * <p>iPLAss はユーザーの言語をログイン時にセッションへキャッシュするため、User を更新するだけでは
 * リロードしても旧言語のままになる。更新後に {@link AuthContext#refresh()} でキャッシュを再読込する。
 * なお、設定の永続化にはテナントの多言語設定が必要。</p>
 */
@WebApi(
		name = "km/user/language/change",
		accepts = RequestType.REST_JSON,
		methods = MethodType.POST,
		responseResults = {@WebApiResultAttribute(name = "result")},
		privileged = false,
		restJson = @RestJson(parameterName = "param"))
@CommandClass(name = "km/user/ChangeLanguageCommand")
public class ChangeLanguageCommand implements Command {

	/** UI が対応する言語。範囲外の値で User を汚さないようホワイトリストで弾く。 */
	private static final Set<String> SUPPORTED_LANGUAGES = Set.of("ja", "en");

	@Override
	public String execute(RequestContext request) {
		String language = request.getParam("language");
		if (language == null || !SUPPORTED_LANGUAGES.contains(language)) {
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse("VALIDATION_ERROR", "Unsupported language: " + language));
			return "ERROR";
		}

		String oid = AuthHelper.getCurrentUserOid();

		// User の更新には管理者権限が要るため特権実行する。language のみを対象にして、
		// 他プロパティの上書きや必須バリデーションの誘発を避ける。
		AuthContext.doPrivileged(() -> {
			EntityManager em = EntityDaoHelper.getEntityManager();
			GenericEntity user = new GenericEntity(User.DEFINITION_NAME);
			user.setOid(oid);
			user.setValue(User.LANGUAGE, language);
			UpdateOption option = new UpdateOption(false);
			option.setUpdateProperties(User.LANGUAGE);
			em.update(user, option);
		});

		// ログイン時にキャッシュされた UserContext を再読込し、リロード後のリクエストへ新言語を反映する。
		AuthContext.getCurrentContext().refresh();

		CommandResponseUtil.setResult(request, CommandResponseUtil.successResponse(language));
		return "SUCCESS";
	}
}
